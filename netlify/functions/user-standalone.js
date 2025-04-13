// user-standalone.js - A completely self-contained function
// This version includes all dependencies inline to avoid module issues

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

// Schema definitions
const pgTable = require('drizzle-orm/pg-core').pgTable;
const text = require('drizzle-orm/pg-core').text;
const serial = require('drizzle-orm/pg-core').serial;
const integer = require('drizzle-orm/pg-core').integer;
const timestamp = require('drizzle-orm/pg-core').timestamp;
const boolean = require('drizzle-orm/pg-core').boolean;
const real = require('drizzle-orm/pg-core').real;
const eq = require('drizzle-orm').eq;

// JWT configurations
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

// Log if using default secret (only in development)
if (JWT_SECRET === 'dev-jwt-secret-change-me' && process.env.NODE_ENV !== 'production') {
  console.log('*** WARNING: Using default JWT_SECRET');
}

// Schema definitions (minimal for user function)
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').notNull().unique(),
});

// Create database pool and drizzle instance
let pool;
let db;

function initializeDB() {
  if (pool && db) return { pool, db };
  
  console.log('*** Initializing database connection');
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    db = drizzle(pool);
    
    console.log('*** Database initialized successfully');
    return { pool, db };
  } catch (error) {
    console.error('*** Database initialization error:', error);
    throw error;
  }
}

// JWT verification
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.log('*** Token verification failed:', error.message);
    return null;
  }
}

// Get user from token
async function getUserFromToken(event) {
  console.log('*** Auth headers:', JSON.stringify(event.headers));
  
  const authHeader = event.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    console.log('*** No Bearer token found');
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload || !payload.id) {
    console.log('*** Invalid token payload');
    return null;
  }

  console.log('*** Valid token for user ID:', payload.id);
  
  // Initialize DB if needed
  const { db } = initializeDB();
  
  // Get user data
  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.id));
    return user;
  } catch (error) {
    console.error('*** Error getting user data:', error);
    return null;
  }
}

// Standard response formatter
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(body)
  };
}

// CORS preflight handler
function handleOptions() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: ''
  };
}

// The main function handler
exports.handler = async (event, context) => {
  console.log('*** Processing request:', event.httpMethod, event.path);
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow GET method
  if (event.httpMethod !== 'GET') {
    return formatResponse(405, { message: 'Method not allowed' });
  }

  try {
    console.log('*** Authenticating user');
    const user = await getUserFromToken(event);
    
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: 'Not authenticated' });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    return formatResponse(200, userWithoutPassword);
  } catch (error) {
    console.error('*** Error in handler:', error);
    return formatResponse(500, { message: 'Internal server error' });
  }
};
