// login-standalone.js - A completely self-contained function
// This version includes all dependencies inline to avoid module issues

const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

// Schema definitions
const pgTable = require('drizzle-orm/pg-core').pgTable;
const text = require('drizzle-orm/pg-core').text;
const serial = require('drizzle-orm/pg-core').serial;
const integer = require('drizzle-orm/pg-core').integer;
const eq = require('drizzle-orm').eq;

// JWT configurations
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const JWT_EXPIRY = "7d"; // 7 days

// Schema definitions (minimal for login function)
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').notNull().unique(),
});

// Scrypt for password hashing
const scryptAsync = promisify(crypto.scrypt);

// Initialize database connection
function initializeDB() {
  console.log('*** Initializing database connection');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool);
    
    console.log('*** Database initialized successfully');
    return { pool, db };
  } catch (error) {
    console.error('*** Database initialization error:', error);
    throw error;
  }
}

// Hash password with salt
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
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
    
    const match = crypto.timingSafeEqual(hashedBuf, suppliedBuf);
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

// Standard response formatter
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body)
  };
}

// CORS preflight handler
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

// The main function handler
exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow POST method
  if (event.httpMethod !== "POST") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    console.log('*** Login attempt - handling request');
    // Parse request body
    const data = JSON.parse(event.body);
    const { username, password } = data;
    
    // Validate required fields
    if (!username || !password) {
      console.log('*** Login failed - missing username or password');
      return formatResponse(400, { message: "Username and password are required" });
    }

    // Initialize database connection
    const { db } = initializeDB();

    console.log(`*** Looking up user with username: ${username}`);
    // Get user by username
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    // Verify user exists and password is correct
    if (!user) {
      console.log('*** Login failed - user not found');
      return formatResponse(401, { message: "Invalid credentials" });
    }
    
    console.log('*** User found, comparing passwords');
    const passwordMatch = await comparePasswords(password, user.password);
    if (!passwordMatch) {
      console.log('*** Login failed - password mismatch');
      return formatResponse(401, { message: "Invalid credentials" });
    }

    console.log('*** Login successful, generating token');
    // Generate JWT token
    const token = generateToken(user);
    console.log('*** Token generated successfully, length:', token.length);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('*** Returning user data and token to client');
    return formatResponse(200, { 
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    return formatResponse(500, { message: "Internal server error" });
  }
};
