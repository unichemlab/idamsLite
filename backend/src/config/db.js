const { Pool } = require("pg");
const dotenv = require("dotenv");

// Decide which .env file to load
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

// Safely coerce DATABASE_URL to a trimmed string
const rawDatabaseUrl = process.env.DATABASE_URL;
console.log(
  "[db] DATABASE_URL present:",
  rawDatabaseUrl ? "✅ (value present)" : "❌ (missing)"
);

const connectionString = String(rawDatabaseUrl || "").trim();

if (!connectionString) {
  console.error("❌ Missing DATABASE_URL in environment variables. Exiting.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool
  .connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection error:", err.message));

module.exports = pool;
