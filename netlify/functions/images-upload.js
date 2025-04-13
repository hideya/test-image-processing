// netlify/functions/images-upload.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");
const { processImageBuffer } = require("./opencv");
const multer = require("multer");
const { Buffer } = require("buffer");

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  // Configure the field name to match what the client sends
  fields: [{ name: 'file' }]
});

// Parse multipart form data
const parseMultipartForm = (event) => {
try {
  console.log('*** Parsing multipart form data');
  const contentType = event.headers['content-type'] || '';
  console.log('*** Content-Type:', contentType);
  const boundary = contentType.split('boundary=')[1];
  
  if (!boundary) {
    console.log('*** No boundary found in content-type');
    return null;
  }

  const parts = event.body.split(`--${boundary}`);
  console.log(`*** Found ${parts.length} parts in the request`);
  
  const formData = {};
  let fileBuffer = null;
  let fileName = '';
  let fileContentType = '';
  let fileFieldName = '';

  parts.forEach((part, index) => {
    if (part.includes('Content-Disposition: form-data;')) {
      // Extract field name
      const nameMatch = part.match(/name="([^"]+)"/); 
      if (nameMatch) {
        const name = nameMatch[1];
        console.log(`*** Found field: ${name} at part ${index}`);
        
        if (part.includes('filename="')) {
          // This is a file
          fileFieldName = name; // Save the field name of the file
          const filenameMatch = part.match(/filename="([^"]+)"/); 
          if (filenameMatch) {
            fileName = filenameMatch[1];
            console.log(`*** File found: ${fileName}`);
            
            // Extract content type 
            const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
            if (contentTypeMatch) {
              fileContentType = contentTypeMatch[1].trim();
              console.log(`*** File content type: ${fileContentType}`);
            }
            
            // Extract file content
            const fileContentStart = part.indexOf('\r\n\r\n') + 4;
            if (fileContentStart > 4) {
              const fileContent = part.slice(fileContentStart).trim();
              // Convert to Buffer
              fileBuffer = Buffer.from(fileContent, 'binary');
              console.log(`*** File buffer created with ${fileBuffer.length} bytes`);
            }
          }
        } else {
          // This is a regular field
          const valueStart = part.indexOf('\r\n\r\n') + 4;
          if (valueStart > 4) {
            formData[name] = part.slice(valueStart).trim();
            console.log(`*** Field value for ${name}:`, formData[name]);
          }
        }
      }
    }
  });

  if (fileBuffer) {
    // Store file in the appropriate field (either file or image) based on field name
    if (fileFieldName === 'image') {
      formData.image = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: fileContentType
      };
      console.log('*** Added image to formData');
    } else {
      formData.file = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: fileContentType
      };
      console.log('*** Added file to formData');
    }
  }

    console.log('*** Form data parsed. Fields:', Object.keys(formData));
    return formData;
  } catch (error) {
    console.log('*** Error parsing multipart form:', error.message);
    console.log('*** Error stack:', error.stack);
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
      
      console.log('*** Form data after parsing:', formData ? Object.keys(formData) : 'null');
      if (formData && formData.image) {
        console.log('*** Found image field instead of file field, adjusting...');
        formData.file = formData.image;
        delete formData.image;
      }
    } catch (err) {
      console.log('*** Error parsing form data:', err);
      return formatResponse(400, { message: "Invalid form data" });
    }
    
    if (!formData || !(formData.file || formData.image)) {
      console.log('*** No file provided in request');
      console.log('*** Available fields:', formData ? Object.keys(formData) : 'none');
      return formatResponse(400, { message: "No image file provided" });
    }
    
    // Handle if image is provided but not file
    if (formData.image && !formData.file) {
      console.log('*** Moving image to file field');
      formData.file = formData.image;
      delete formData.image;
    }
    
    // Generate a hash key for the image (still needed for database reference)
    const hashKey = storage.generateHashKey();
    
    console.log(`*** Processing file with hash key: ${hashKey}`);
    
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
    
    // Log client rotation value if provided (for debugging only)
    if (formData.clientRotation) {
      console.log(`*** Client applied rotation of ${formData.clientRotation} degrees before upload`);
    }
    
    // Process the image synchronously
    console.log('*** Processing image synchronously');
    const processingResult = await processImageBuffer(formData.file.buffer);
    
    // Convert image to base64 for response
    const processedImageBase64 = processingResult.processedImageBuffer.toString('base64');
    
    console.log('*** Image processing completed successfully');
    
    // Create image record in the database (without physical file)
    const imageData = {
      userId: user.id,
      hashKey: hashKey,
      isProcessed: true,
      processedAngle: processingResult.angle,
      processedAngle2: processingResult.angle2
    };
    
    console.log('*** Creating image record in database');
    const image = await storage.createImageWithoutFile(imageData);
    
    // Create angle measurement record
    console.log('*** Creating angle measurement record');
    const measurementData = {
      imageId: image.id,
      userId: user.id,
      angle: processingResult.angle,
      angle2: processingResult.angle2,
      customTimestamp: customDate,
      memo: formData.memo || undefined,
      iconIds: formData.iconIds || undefined
    };
    
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
    
    const measurement = await storage.createAngleMeasurement(measurementData);
    
    // Return complete response with processed image and data
    console.log('*** Returning success response with processed image');
    return formatResponse(200, {
      success: true,
      measurement: {
        id: measurement.id,
        angle: processingResult.angle,
        angle2: processingResult.angle2,
        date: customDate
      },
      image: {
        id: image.id,
        hashKey: image.hashKey
      },
      processedImage: {
        base64: processedImageBase64,
        mimeType: 'image/jpeg'
      }
    });
    
  } catch (error) {
    console.error('*** Upload error:', error);
    return formatResponse(500, { message: "Failed to upload image" });
  }
};