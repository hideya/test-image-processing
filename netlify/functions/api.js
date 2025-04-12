// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const { registerRoutes } = require('../../dist/routes'); // Import your routes function

// Create Express app
const app = express();
app.use(express.json());

// Set up session middleware and other global middleware here
// ...

// Register all routes
registerRoutes(app);

// Export the serverless function handler
module.exports.handler = serverless(app);
