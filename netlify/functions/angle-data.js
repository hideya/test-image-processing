// netlify/functions/angle-data.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");

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
    console.log('*** Processing angle-data request');
    
    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Get days parameter from query string or use default
    const days = event.queryStringParameters && event.queryStringParameters.days
      ? parseInt(event.queryStringParameters.days, 10)
      : 30;
    
    console.log(`*** Fetching angle data for last ${days} days`);
    
    // Get angle measurements for the specified date range
    const measurements = await storage.getLatestAngleMeasurementByDay(
      user.id,
      days
    );
    
    console.log(`*** Found ${measurements.length} measurements`);
    
    // Return the measurements
    return formatResponse(200, measurements);
    
  } catch (error) {
    console.error('*** Error fetching angle data:', error);
    return formatResponse(500, { message: "Failed to fetch angle data" });
  }
};
