// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const { registerRoutes } = require('./routes'); // Import your routes function

// Create Express app
const app = express();
app.use(express.json());

// Set up session middleware and other global middleware here
const session = require('express-session');
const passport = require('passport');

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use environment variable
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Add CORS middleware if needed
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Add body parser middleware
app.use(express.urlencoded({ extended: true }));

// Register all routes
registerRoutes(app);

// Export the serverless function handler
module.exports.handler = serverless(app);
