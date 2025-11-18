module.exports = {
  apps: [
    // BACKEND (DEV)
    {
      name: "idams-dev-backend",
      cwd: "./backend",
      script: "src/app.js",
      watch: true,
      env: {
        NODE_ENV: "development",
        PORT: 4000
      }
    },

    // FRONTEND (DEV)
    {
  name: "idams-dev-frontend",
  cwd: "./frontend",
  script: "serve",
  args: "-s build -l 3000",
  env: {
    NODE_ENV: "production",
    PORT: 3000
  }
}
  ]
};
