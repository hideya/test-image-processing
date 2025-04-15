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
    
    // Debug log to show exactly what we're receiving
    console.log('*** Event path:', event.path);
    console.log('*** Event path segments:', event.path.split('/'));
    console.log('*** Event headers:', event.headers);
    console.log('*** Event body:', event.body);
    
    // Better path extraction that works with both direct function calls and redirects
    let measurementId;
    
    // Try to extract from path parameters if available
    if (event.pathParameters && event.pathParameters.id) {
      measurementId = event.pathParameters.id;
    } 
    // Try to get the ID from the path (works with redirects in netlify.toml)
    else {
      // Check different path patterns
      const pathSegments = event.path.split('/');
      // Look for 'metadata' and take the segment before it
      const metadataIndex = pathSegments.findIndex(segment => segment === 'metadata');
      if (metadataIndex > 0) {
        measurementId = pathSegments[metadataIndex - 1];
      } else {
        // Just take the last segment as a fallback
        measurementId = pathSegments[pathSegments.length - 1];
      }
    }
    
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
    
    console.log('*** Request body fields:', { memo, iconIds });
    
    // Normalize iconIds - handle both empty arrays and strings properly
    let normalizedIconIds = iconIds;
    if (iconIds === "") {
      // Empty string should clear icons
      normalizedIconIds = "";
      console.log('*** Received empty string for iconIds, will clear icons');
    } else if (Array.isArray(iconIds)) {
      if (iconIds.length === 0) {
        // Empty array should also clear icons
        normalizedIconIds = "";
        console.log('*** Received empty array for iconIds, will clear icons');
      } else {
        normalizedIconIds = iconIds.join(',');
        console.log('*** Normalized iconIds from array:', normalizedIconIds);
      }
    }
    
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
      { memo, iconIds: normalizedIconIds }
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