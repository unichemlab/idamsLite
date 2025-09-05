const express = require("express");
const cors = require("cors");
require("dotenv").config();

const plantRoutes = require("./routes/plantRoutes");
const roleRoutes = require("./routes/roleRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/plants", plantRoutes);
app.use("/api/roles", roleRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
