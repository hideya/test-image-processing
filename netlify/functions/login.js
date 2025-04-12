// netlify/functions/login.js
const { comparePasswords, formatResponse, handleOptions, generateToken } = require("./auth-utils");
const { storage } = require("./storage");

const handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow POST method
  if (event.httpMethod !== "POST") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    const { username, password } = data;
    
    // Validate required fields
    if (!username || !password) {
      return formatResponse(400, { message: "Username and password are required" });
    }

    // Get user by username
    const user = await storage.getUserByUsername(username);
    
    // Verify user exists and password is correct
    if (!user || !(await comparePasswords(password, user.password))) {
      return formatResponse(401, { message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken(user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return formatResponse(200, { 
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    return formatResponse(500, { message: "Internal server error" });
  }
};

module.exports = { handler };