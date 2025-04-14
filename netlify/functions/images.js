// netlify/functions/images.js
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
    console.log('*** Processing images request:', event.path);
    
    // Parse the path to extract hashKey
    const pathParts = event.path.split('/');
    const hashKey = pathParts[pathParts.length - 1];
    
    console.log(`*** Requested image: ${hashKey}`);
    
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
    
    // Check if the user is authorized to access this image
    if (image.userId !== user.id) {
      console.log('*** Unauthorized access attempt');
      return formatResponse(403, { message: "Unauthorized access to image" });
    }
    
    // For serverless functions, respond with a message that direct image access is no longer supported
    // Instead, clients should use the base64 data returned from the upload endpoint
    return formatResponse(307, { 
      message: "Image data is now returned directly in the upload response. Please update your client to the newest version.", 
      redirectUrl: "/app/settings?update=true"
    });
    
  } catch (error) {
    console.error('*** Error retrieving image:', error);
    return formatResponse(500, { message: "Failed to retrieve image" });
  }
};