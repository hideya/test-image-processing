// netlify/functions/angle-data.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");

// Validate that date strings are in YYYY-MM-DD format
function isValidDateFormat(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateStr);
}

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
    
    const queryParams = event.queryStringParameters || {};
    
    // Check if start and end dates are provided
    if (queryParams.start && queryParams.end) {
      // Validate date formats
      if (!isValidDateFormat(queryParams.start) || !isValidDateFormat(queryParams.end)) {
        return formatResponse(400, { message: "Invalid date format. Please use YYYY-MM-DD format." });
      }
      
      const startDate = new Date(queryParams.start);
      startDate.setHours(0, 0, 0, 0); // Start of day
      
      const endDate = new Date(queryParams.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      console.log(`*** Fetching measurements for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Get angle measurements for the specified date range
      const measurements = await storage.getAngleMeasurementsByDateRange(
        user.id,
        startDate,
        endDate
      );
      
      console.log(`*** Found ${measurements.length} measurements for date range`);
      
      return formatResponse(200, measurements);
    } else {
      // Fallback to days parameter if no date range provided
      const days = queryParams.days ? parseInt(queryParams.days, 10) : 30;
      
      console.log(`*** Fetching angle data for last ${days} days`);
      
      // Get angle measurements for the specified number of days
      const measurements = await storage.getLatestAngleMeasurementByDay(
        user.id,
        days
      );
      
      console.log(`*** Found ${measurements.length} measurements for days`);
      
      // Return the measurements
      return formatResponse(200, measurements);
    }
  } catch (error) {
    console.error('*** Error fetching angle data:', error);
    return formatResponse(500, { message: "Failed to fetch angle data" });
  }
};
