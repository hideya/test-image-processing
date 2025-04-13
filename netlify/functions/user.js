// netlify/functions/user.js
const { getUserFromToken, formatResponse, handleOptions } = require("./auth-utils");

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow GET method
  if (event.httpMethod !== "GET") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    console.log('*** /api/user - Handling user info request');
    console.log('*** Headers received:', JSON.stringify(event.headers));
    
    // Get user from token
    console.log('*** Attempting to authenticate user from token');
    const user = await getUserFromToken(event);
    
    if (!user) {
      console.log('*** Authentication failed - no valid user found');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated successfully, ID:', user.id);
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    
    console.log('*** Returning user data to client');
    return formatResponse(200, userWithoutPassword);
  } catch (error) {
    console.error("Get user error:", error);
    return formatResponse(500, { message: "Internal server error" });
  }
};
