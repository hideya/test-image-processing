// netlify/functions/register.js
const { hashPassword, formatResponse, handleOptions, generateToken } = require("./auth-utils");
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
    const { username, email, password } = data;
    
    // Validate required fields
    if (!username || !email || !password) {
      return formatResponse(400, { message: "Username, email, and password are required" });
    }

    // Check if username exists
    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return formatResponse(400, { message: "Username already exists" });
    }
    
    // Check if email exists
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return formatResponse(400, { message: "Email already in use" });
    }

    // Create user with hashed password
    const user = await storage.createUser({
      username,
      email,
      password: await hashPassword(password),
    });

    // Generate JWT token
    const token = generateToken(user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return formatResponse(201, { 
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Registration error:", error);
    return formatResponse(500, { message: "Internal server error" });
  }
};

module.exports = { handler };