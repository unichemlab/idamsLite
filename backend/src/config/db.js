const { Pool } = require("pg");
require("dotenv").config(); // load environment variables from .env

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
