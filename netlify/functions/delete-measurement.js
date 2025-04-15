// netlify/functions/delete-measurement.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow DELETE method
  if (event.httpMethod !== "DELETE") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    console.log('*** Processing measurement deletion request');
    
    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Extract measurement ID from path
    let measurementId;
    
    // Try to extract from path parameters if available
    if (event.pathParameters && event.pathParameters.id) {
      measurementId = event.pathParameters.id;
    } 
    // Try to get the ID from the path (works with redirects in netlify.toml)
    else {
      const pathSegments = event.path.split('/');
      // Just take the last segment as a fallback
      measurementId = pathSegments[pathSegments.length - 1];
    }
    
    if (!measurementId || isNaN(parseInt(measurementId))) {
      console.log('*** Invalid measurement ID:', measurementId);
      return formatResponse(400, { message: "Invalid measurement ID" });
    }
    
    const numericId = parseInt(measurementId);
    
    // Get existing measurement to verify ownership
    const existingMeasurement = await storage.getMeasurementById(numericId);
    
    if (!existingMeasurement) {
      console.log('*** Measurement not found:', measurementId);
      return formatResponse(404, { message: "Measurement not found" });
    }
    
    // Verify the user owns this measurement
    if (existingMeasurement.userId !== user.id) {
      console.log('*** Unauthorized access attempt');
      return formatResponse(403, { message: "Unauthorized" });
    }
    
    // Delete the measurement
    console.log('*** Deleting measurement with ID:', numericId);
    await storage.deleteMeasurementById(numericId);
    
    console.log('*** Measurement deletion successful');
    return formatResponse(200, {
      success: true,
      message: "Measurement deleted successfully"
    });
    
  } catch (error) {
    console.error('*** Measurement deletion error:', error);
    return formatResponse(500, { message: "Failed to delete measurement: " + error.message });
  }
};