// netlify/functions/user.js
const { getUserFromToken, formatResponse, handleOptions } = require("./auth-utils");

const handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow GET method
  if (event.httpMethod !== "GET") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    // Get user from token
    const user = await getUserFromToken(event);
    
    if (!user) {
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    
    return formatResponse(200, userWithoutPassword);
  } catch (error) {
    console.error("Get user error:", error);
    return formatResponse(500, { message: "Internal server error" });
  }
};

module.exports = { handler };