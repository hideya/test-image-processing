require('dotenv/config'); // Add this at the top with your other imports
const express = require("express");
const { registerRoutes } = require("./routes");
// import { setupVite, serveStatic, log } from "./vite";
const { ensureOpenCVReady } = require("./opencv");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function log(...args) {
  console.log(...args);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize OpenCV
  try {
    log('Initializing OpenCV...');
    await ensureOpenCVReady();
    log('OpenCV initialized successfully');
  } catch (error) {
    log('Error initializing OpenCV: ' + error.message);
    // Continue anyway, we have a fallback mechanism
  }
  
  const server = await registerRoutes(app);

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // // importantly only setup vite in development and after
  // // setting up all the other routes so the catch-all route
  // // doesn't interfere with the other routes
  // if (app.get("env") === "development") {
  //   await setupVite(app, server);
  // } else {
  //   serveStatic(app);
  // }

  // Get port from environment variable or use 5000 as default
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const port = 5001;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

module.exports = app;
