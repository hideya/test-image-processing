// netlify/functions/login.js
const { comparePasswords, formatResponse, handleOptions, generateToken } = require("./auth-utils");
const { storage } = require("./storage");

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

    console.log(`*** Looking up user with username: ${username}`);
    // Get user by username
    const user = await storage.getUserByUsername(username);
    
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
