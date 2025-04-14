// netlify/functions/update-metadata.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow PATCH method
  if (event.httpMethod !== "PATCH") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    console.log('*** Processing metadata update request');
    
    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Get measurement ID from URL path
    const measurementId = event.path.split('/').pop();
    
    if (!measurementId || isNaN(parseInt(measurementId))) {
      console.log('*** Invalid measurement ID:', measurementId);
      return formatResponse(400, { message: "Invalid measurement ID" });
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      console.log('*** Error parsing request body:', error);
      return formatResponse(400, { message: "Invalid request body" });
    }
    
    // Extract metadata fields
    const { memo, iconIds } = requestBody;
    
    // Get existing measurement to verify ownership
    const existingMeasurement = await storage.getMeasurementById(parseInt(measurementId));
    
    if (!existingMeasurement) {
      console.log('*** Measurement not found:', measurementId);
      return formatResponse(404, { message: "Measurement not found" });
    }
    
    // Verify the user owns this measurement
    if (existingMeasurement.userId !== user.id) {
      console.log('*** Unauthorized access attempt');
      return formatResponse(403, { message: "Unauthorized" });
    }
    
    // Update measurement metadata
    console.log('*** Updating measurement metadata for ID:', measurementId);
    const updatedMeasurement = await storage.updateMeasurementMetadata(
      parseInt(measurementId),
      { memo, iconIds }
    );
    
    console.log('*** Metadata update successful');
    return formatResponse(200, {
      success: true,
      measurement: updatedMeasurement
    });
    
  } catch (error) {
    console.error('*** Metadata update error:', error);
    return formatResponse(500, { message: "Failed to update metadata: " + error.message });
  }
};