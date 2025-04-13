// netlify/functions/auth-utils.js
const { scrypt, randomBytes, timingSafeEqual } = require("crypto");
const { promisify } = require("util");
const { storage } = require("./storage"); // Ensure your storage module is compatible with serverless
const jwt = require("jsonwebtoken");

// Debug all env variables
console.log('*** Environment variables:', Object.keys(process.env));
console.log('*** JWT_SECRET is set:', !!process.env.JWT_SECRET);

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
const JWT_EXPIRY = "7d"; // 7 days

// Log if we're using default secret
if (JWT_SECRET === "dev-jwt-secret-change-me") {
  console.log('*** WARNING: Using default JWT_SECRET - this should not happen in production!');
}

// Hash password with salt
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

// Compare password with stored hash
async function comparePasswords(supplied, stored) {
  console.log('*** Comparing passwords');
  try {
    const [hashed, salt] = stored.split(".");
    console.log('*** Password hash and salt extracted');
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64));
    
    const match = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log('*** Password comparison result:', match);
    return match;
  } catch (error) {
    console.log('*** Error comparing passwords:', error.message);
    throw error;
  }
}

// Generate JWT token from user object
function generateToken(user) {
  console.log('*** Generating JWT token for user ID:', user.id);
  // Never include sensitive information in JWT
  const { password, ...userWithoutPassword } = user;
  try {
    const token = jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log('*** JWT token generated successfully');
    return token;
  } catch (error) {
    console.log('*** Error generating JWT token:', error.message);
    throw error;
  }
}

// Verify JWT token
function verifyToken(token) {
  try {
    console.log('*** Verifying token with JWT_SECRET length:', JWT_SECRET.length);
    const result = jwt.verify(token, JWT_SECRET);
    console.log('*** Token verified successfully');
    return result;
  } catch (error) {
    console.log('*** Token verification failed:', error.message);
    return null;
  }
}

// Get user from authorization header
async function getUserFromToken(event) {
  console.log('*** Auth headers:', JSON.stringify(event.headers));
  const authHeader = event.headers.authorization || '';
  console.log('*** Authorization header:', authHeader);
  
  if (!authHeader.startsWith('Bearer ')) {
    console.log('*** No Bearer token found');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('*** Token found, verifying...');
  const payload = verifyToken(token);
  
  if (!payload || !payload.id) {
    console.log('*** Invalid token payload:', payload);
    return null;
  }

  console.log('*** Valid token for user ID:', payload.id);
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