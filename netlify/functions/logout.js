// netlify/functions/logout.js
const { formatResponse, handleOptions } = require("./auth-utils");

// Note: With JWT-based auth, there's no server-side session to invalidate.
// The client should simply remove the token from storage.
// This endpoint exists for API consistency.

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow POST method
  if (event.httpMethod !== "POST") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  // There's no server-side session to invalidate, so we just return success
  return formatResponse(200, { message: "Logged out successfully" });
};
