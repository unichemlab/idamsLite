const express = require("express");
const router = express.Router();
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PharmaCorp API",
      version: "1.0.0",
      description: "API documentation for PharmaCorp backend",
    },
    servers: [{ url: "http://localhost:4000" }],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const specs = swaggerJsdoc(options);

router.use("/", swaggerUi.serve, swaggerUi.setup(specs));

module.exports = router;
