// netlify/functions/latest-angle.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { db } = require("./db");
const { eq, desc } = require("drizzle-orm");
const { angleMeasurements } = require("./schema");

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
    console.log('*** Processing latest-angle request');
    
    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Fetch the last measurement based on the ID (last inserted)
    console.log('*** Fetching last measurement from database');
    const [lastMeasurement] = await db
      .select()
      .from(angleMeasurements)
      .where(eq(angleMeasurements.userId, user.id))
      .orderBy(desc(angleMeasurements.id))
      .limit(1);
    
    if (!lastMeasurement) {
      console.log('*** No measurements found');
      return formatResponse(200, { angle: null, angle2: null });
    }
    
    console.log('*** Found measurement:', lastMeasurement.id);
    
    // Return the angles
    return formatResponse(200, {
      angle: lastMeasurement.angle,
      angle2: lastMeasurement.angle2
    });
    
  } catch (error) {
    console.error('*** Error fetching latest angle:', error);
    return formatResponse(500, { message: "Error fetching latest angle" });
  }
};
