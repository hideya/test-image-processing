// netlify/functions/images-upload.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");
const { processImage, preprocessImage } = require("./opencv");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const util = require("util");
const { Buffer } = require("buffer");

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Parse multipart form data
const parseMultipartForm = (event) => {
  try {
    console.log('*** Parsing multipart form data');
    const contentType = event.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      console.log('*** No boundary found in content-type');
      return null;
    }

    const parts = event.body.split(`--${boundary}`);
    const formData = {};
    let fileBuffer = null;
    let fileName = '';
    let fileContentType = '';

    parts.forEach(part => {
      if (part.includes('Content-Disposition: form-data;')) {
        // Extract field name
        const nameMatch = part.match(/name="([^"]+)"/);
        if (nameMatch) {
          const name = nameMatch[1];
          
          if (part.includes('filename="')) {
            // This is a file
            const filenameMatch = part.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              fileName = filenameMatch[1];
              
              // Extract content type
              const contentTypeMatch = part.match(/Content-Type: ([^\\r\\n]+)/);
              if (contentTypeMatch) {
                fileContentType = contentTypeMatch[1].trim();
              }
              
              // Extract file content
              const fileContentStart = part.indexOf('\r\n\r\n') + 4;
              if (fileContentStart > 4) {
                const fileContent = part.slice(fileContentStart).trim();
                // Convert to Buffer
                fileBuffer = Buffer.from(fileContent, 'binary');
              }
            }
          } else {
            // This is a regular field
            const valueStart = part.indexOf('\r\n\r\n') + 4;
            if (valueStart > 4) {
              formData[name] = part.slice(valueStart).trim();
            }
          }
        }
      }
    });

    if (fileBuffer) {
      formData.file = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: fileContentType
      };
    }

    console.log('*** Form data parsed:', Object.keys(formData));
    return formData;
  } catch (error) {
    console.log('*** Error parsing multipart form:', error.message);
    return null;
  }
};

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return handleOptions();
  }

  // Only allow POST method
  if (event.httpMethod !== "POST") {
    return formatResponse(405, { message: "Method not allowed" });
  }

  try {
    console.log('*** Processing image upload request');
    
    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      console.log('*** Authentication failed');
      return formatResponse(401, { message: "Not authenticated" });
    }
    
    console.log('*** User authenticated:', user.id);
    
    // Parse the multipart form data
    let formData;
    
    try {
      // If the event body is a string, it needs to be parsed
      if (typeof event.body === 'string' && event.body.startsWith('--')) {
        formData = parseMultipartForm(event);
      } else if (typeof event.body === 'string') {
        // Try to parse as JSON if it's not multipart
        formData = JSON.parse(event.body);
      } else {
        // Assume it's already an object
        formData = event.body;
      }
    } catch (err) {
      console.log('*** Error parsing form data:', err);
      return formatResponse(400, { message: "Invalid form data" });
    }
    
    if (!formData || !formData.file) {
      console.log('*** No file provided in request');
      return formatResponse(400, { message: "No image file provided" });
    }
    
    // Generate a hash key for the image
    const hashKey = storage.generateHashKey();
    const fileExt = path.extname(formData.file.originalname);
    const filename = `${hashKey}${fileExt}`;
    
    console.log(`*** Processing file: ${filename}`);
    
    // Check for required customDate field
    if (!formData.customDate) {
      console.log('*** No customDate provided');
      return formatResponse(400, {
        message: "Measurement date is required. Please provide a customDate field."
      });
    }
    
    // Parse and validate date
    let customDate;
    try {
      customDate = new Date(formData.customDate);
      
      // Validate the date isn't in the future
      const currentDate = new Date();
      if (customDate > currentDate) {
        console.log('*** Date is in the future');
        return formatResponse(400, {
          message: "Measurement date cannot be in the future"
        });
      }
    } catch (err) {
      console.log('*** Invalid date format:', formData.customDate);
      return formatResponse(400, {
        message: "Invalid date format. Please use ISO date format."
      });
    }
    
    // Get rotation value if provided
    let rotation = 0;
    if (formData.rotation) {
      try {
        rotation = parseInt(formData.rotation, 10);
        // Normalize to 0, 90, 180, or 270 degrees
        rotation = ((rotation % 360) + 360) % 360;
        console.log(`*** Applying rotation of ${rotation} degrees`);
      } catch (err) {
        console.log('*** Invalid rotation value, defaulting to 0');
      }
    }
    
    // Save the original image, applying rotation if specified
    console.log('*** Saving image file');
    const imagePath = await storage.saveImageFile(
      formData.file.buffer,
      filename,
      rotation
    );
    
    // Save image record to database
    console.log('*** Creating image record in database');
    const image = await storage.createImage({
      userId: user.id,
      imagePath,
      hashKey,
    });
    
    // Process the image asynchronously (don't wait for it to finish)
    console.log('*** Starting async image processing');
    preprocessImage(imagePath)
      .then((processedImagePath) => {
        console.log('*** Image preprocessed, calculating angles');
        return processImage(processedImagePath).then(async (angles) => {
          // Update the image with processed angles
          console.log('*** Updating image with angles:', angles);
          await storage.updateImageProcessedAngles(
            image.id,
            angles.angle,
            angles.angle2
          );
          
          // Check if there are existing measurements for this date
          const existingMeasurements = await storage.findMeasurementsByUserIdAndDate(
            user.id,
            customDate
          );
          
          // If there are existing measurements, delete them (we're replacing them)
          if (existingMeasurements.length > 0) {
            console.log(`*** Found ${existingMeasurements.length} existing measurements for date ${customDate.toISOString()}`);
            for (const measurement of existingMeasurements) {
              await storage.deleteMeasurementById(measurement.id);
            }
          }
          
          // Create angle measurement record
          console.log('*** Creating angle measurement record');
          const measurementData = {
            imageId: image.id,
            userId: user.id,
            angle: angles.angle,
            angle2: angles.angle2,
            customTimestamp: customDate,
            memo: formData.memo || undefined,
            iconIds: formData.iconIds || undefined
          };
          
          await storage.createAngleMeasurement(measurementData);
          console.log('*** Image processing completed successfully');
        });
      })
      .catch((err) => {
        console.error('*** Error processing image:', err);
      });
    
    // Return immediate response with image info
    console.log('*** Returning success response');
    return formatResponse(201, {
      id: image.id,
      hashKey: image.hashKey,
      message: "Image uploaded successfully and scheduled for processing"
    });
    
  } catch (error) {
    console.error('*** Upload error:', error);
    return formatResponse(500, { message: "Failed to upload image" });
  }
};
