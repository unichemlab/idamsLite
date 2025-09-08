const express = require("express");
const cors = require("cors");
require("dotenv").config();

const plantRoutes = require("./routes/plantRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const roleRoutes = require("./routes/roleRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const swaggerRoutes = require("./routes/swagger");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // Change to your frontend URL if different
    credentials: true,
  })
);
app.use(express.json());


app.use("/api/plants", plantRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/roles", roleRoutes);

app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
