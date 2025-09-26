const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const plantRoutes = require("./routes/plantRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const roleRoutes = require("./routes/roleRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const userRequest = require("./routes/userRequest");
const applicationRoutes = require("./routes/applicationRoutes");
const systemRoutes = require("./routes/systemRoutes");
const swaggerRoutes = require("./routes/swagger");
const os = require("os");
const serverRoutes = require("./routes/serverRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // Change to your frontend URL if different
    credentials: true,
  })
);
app.use(express.json());
// Static file serving middleware (ensuring uploads folder is correctly handled)
app.use("/uploads", express.static(path.join(__dirname, "src", "uploads")));

app.use("/api/plants", plantRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/systems", systemRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user-requests", userRequest);
app.use("/api/applications", applicationRoutes);
app.use("/api/docs", swaggerRoutes);

// ✅ API to get laptop login user
app.get("/api/current-user", (req, res) => {
  try {
    const userInfo = os.userInfo(); // username, homedir, shell
    const systemInfo = {
      platform: os.platform(),       // e.g., 'win32'
      release: os.release(),         // OS version
      arch: os.arch(),               // CPU architecture
      hostname: os.hostname(),       // machine name
      totalMem: os.totalmem(),       // total system memory
      freeMem: os.freemem(),         // free memory
      cpus: os.cpus().map(cpu => cpu.model), // CPU model info
    };

    res.json({
      username: userInfo.username,
      homedir: userInfo.homedir,
      shell: userInfo.shell,
      system: systemInfo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get current user info" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
