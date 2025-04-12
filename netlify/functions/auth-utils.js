// netlify/functions/auth-utils.js
const { scrypt, randomBytes, timingSafeEqual } = require("crypto");
const { promisify } = require("util");
const { storage } = require("./storage"); // Ensure your storage module is compatible with serverless
const jwt = require("jsonwebtoken");

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
const JWT_EXPIRY = "7d"; // 7 days

// Hash password with salt
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

// Compare password with stored hash
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64));
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate JWT token from user object
function generateToken(user) {
  // Never include sensitive information in JWT
  const { password, ...userWithoutPassword } = user;
  return jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get user from authorization header
async function getUserFromToken(event) {
  const authHeader = event.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload || !payload.id) {
    return null;
  }

  // Fetch the latest user data from storage
  return await storage.getUser(payload.id);
}

// Generate consistent response format
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Configure as needed for your domains
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body)
  };
}

// Handle OPTIONS requests for CORS
function handleOptions() {
  return {
    statusCode: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: ""
  };
}

module.exports = {
  hashPassword,
  comparePasswords,
  generateToken,
  verifyToken,
  getUserFromToken,
  formatResponse,
  handleOptions
};