// netlify/functions/images.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");
const path = require("path");
const fs = require("fs");

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
    
    // Parse the path to extract hashKey and type
    const pathParts = event.path.split('/');
    let hashKey, requestType;
    
    // Check if this is a specific image type request
    if (pathParts.includes('original') || pathParts.includes('medium')) {
      // Format: /api/images/{hashKey}/{type}
      hashKey = pathParts[pathParts.length - 2];
      requestType = pathParts[pathParts.length - 1];
    } else {
      // Format: /api/images/{hashKey}
      hashKey = pathParts[pathParts.length - 1];
      requestType = 'default';
    }
    
    console.log(`*** Requested image: ${hashKey}, type: ${requestType}`);
    
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
    
    // Handle different image types
    let imagePath;
    let cacheControl;
    
    switch (requestType) {
      case 'medium':
        console.log('*** Getting medium-sized image');
        imagePath = await storage.getMediumImagePath(hashKey);
        cacheControl = 'public, max-age=86400'; // 24 hour cache
        break;
        
      case 'original':
      case 'default':
        console.log('*** Getting original image');
        imagePath = image.imagePath;
        cacheControl = 'no-cache, no-store, must-revalidate';
        break;
        
      default:
        return formatResponse(400, { message: "Invalid image type requested" });
    }
    
    // Verify the file exists
    if (!imagePath || !fs.existsSync(imagePath)) {
      console.log(`*** Image file not found: ${imagePath}`);
      return formatResponse(404, { message: "Image file not found" });
    }
    
    console.log(`*** Sending image file: ${imagePath}`);
    
    // For serverless functions, we can't directly send files
    // We need to read the file and return it as base64 encoded data
    const fileData = await fs.promises.readFile(imagePath);
    const base64Data = fileData.toString('base64');
    
    // Determine content type based on file extension
    const ext = path.extname(imagePath).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    }
    
    // Return the image
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Pragma': requestType === 'medium' ? 'cache' : 'no-cache',
        'Expires': requestType === 'medium' ? '86400' : '0'
      },
      body: base64Data,
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error('*** Error retrieving image:', error);
    return formatResponse(500, { message: "Failed to retrieve image" });
  }
};
