// netlify/functions/thumbnails.js
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
    console.log('*** Processing thumbnails request');
    
    // Parse the path to extract hashKey
    const pathParts = event.path.split('/');
    const hashKey = pathParts[pathParts.length - 1];
    
    console.log(`*** Requested thumbnail for image: ${hashKey}`);
    
    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Get the image by hash key
    console.log(`*** Fetching image with hashKey: ${hashKey}`);
    const image = await storage.getImageByHashKey(hashKey);
    
    if (!image) {
      console.log('*** Image not found');
      return formatResponse(404, { message: "Image not found" });
    }
    
    // Check if the user is authorized to access this thumbnail
    if (image.userId !== user.id) {
      console.log('*** Unauthorized access attempt');
      return formatResponse(403, { message: "Unauthorized access to thumbnail" });
    }
    
    // Note: The original code in routes.ts always returns a 404 for thumbnails
    // Let's maintain the same behavior
    console.log('*** Thumbnail generation not implemented');
    return formatResponse(404, { message: "Image file not found for thumbnail generation" });
    
  } catch (error) {
    console.error('*** Error retrieving thumbnail:', error);
    return formatResponse(500, { message: "Failed to retrieve thumbnail" });
  }
};
