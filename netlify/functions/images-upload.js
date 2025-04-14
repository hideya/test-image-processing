// netlify/functions/images-upload.js
const { formatResponse, getUserFromToken, handleOptions } = require("./auth-utils");
const { storage } = require("./storage");
const { processImageBuffer } = require("./opencv");
const { Buffer } = require("buffer");
const busboy = require('busboy');

/**
 * Parse multipart form data using busboy
 * 
 * We're using busboy instead of multer for several reasons:
 * 1. Better compatibility with serverless environments like Netlify Functions
 * 2. Direct control over the parsing process (important in serverless)
 * 3. Stream processing capabilities (memory efficient)
 * 4. Fewer dependencies (better for cold start times)
 * 
 * @param {Object} event - The Netlify Functions event object
 * @returns {Promise<Object>} Parsed form data with files and fields
 */
function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    try {
      console.log('*** Using busboy to parse multipart form data');
      
      // Handle case where event.headers might have uppercase keys
      const headers = {};
      for (const key in event.headers) {
        headers[key.toLowerCase()] = event.headers[key];
      }
      
      // Create busboy instance (using the proper import)
      // Busboy accepts headers and limits as configuration
      const bb = busboy({ 
        headers: headers,
        limits: {
          fileSize: 10 * 1024 * 1024 // 10MB limit
        }
      });
      
      const formData = {};
      
      // Handle regular form fields
      bb.on('field', (fieldname, val) => {
        console.log(`*** Field received: ${fieldname}`);
        formData[fieldname] = val;
      });
      
      // Handle file uploads
      // Note: In newer busboy versions, file callback has a fileInfo object parameter
      bb.on('file', (fieldname, fileStream, fileInfo) => {
        const { filename, encoding, mimeType } = fileInfo;
        console.log(`*** File received: ${fieldname}, filename: ${filename}, mimetype: ${mimeType}`);
        
        const chunks = [];
        
        // Process file data as it comes in chunks (streaming)
        fileStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        // Once all chunks are received, create a complete buffer
        fileStream.on('end', () => {
          if (chunks.length > 0) {
            const buffer = Buffer.concat(chunks);
            console.log(`*** File buffer created with ${buffer.length} bytes for ${fieldname}`);
            
            formData[fieldname] = {
              buffer: buffer,
              originalname: filename,
              mimetype: mimeType
            };
          } else {
            console.log(`*** Warning: Empty file received for ${fieldname}`);
          }
        });
      });
      
      // Form parsing is complete
      bb.on('finish', () => {
        console.log('*** Form data parsed. Fields:', Object.keys(formData));
        resolve(formData);
      });
      
      // Handle any parsing errors
      bb.on('error', (error) => {
        console.log('*** Busboy error:', error.message);
        reject(error);
      });
      
      // Handle Base64 encoded bodies (common in Netlify Functions)
      if (event.isBase64Encoded) {
        console.log('*** Processing base64 encoded body');
        const buffer = Buffer.from(event.body, 'base64');
        bb.write(buffer);
      } else {
        console.log('*** Processing regular body');
        bb.write(Buffer.from(event.body, 'binary'));
      }
      
      bb.end();
    } catch (error) {
      console.log('*** Error setting up busboy:', error.message);
      console.log('*** Error stack:', error.stack);
      reject(error);
    }
  });
}

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
      // Check content-type header first
      const contentType = event.headers['content-type'] || '';
      console.log('*** Content-Type:', contentType);
      
      // If content-type includes multipart/form-data
      if (contentType.includes('multipart/form-data')) {
        console.log('*** Detected multipart form data');
        formData = await parseMultipartForm(event);
      } else if (typeof event.body === 'string') {
        // Try to parse as JSON if it's not multipart
        try {
          console.log('*** Attempting to parse as JSON');
          formData = JSON.parse(event.body);
        } catch (err) {
          console.log('*** Cannot parse as JSON, falling back to multipart parse');
          formData = await parseMultipartForm(event);
        }
      } else {
        // Assume it's already an object
        console.log('*** Using body directly as object');
        formData = event.body;
      }
      
      // Enhanced debugging for formData
      console.log('*** Form data after parsing:', formData ? Object.keys(formData).join(', ') : 'null');
      for (const key in formData) {
        if (key === 'file' || key === 'image') {
          const fileObj = formData[key];
          console.log(`*** ${key} details:`, {
            originalname: fileObj.originalname,
            mimetype: fileObj.mimetype,
            bufferLength: fileObj.buffer ? fileObj.buffer.length : 'undefined'
          });
        } else {
          console.log(`*** ${key}:`, formData[key]);
        }
      }
      
      // Normalize image/file fields
      if (formData && formData.image && !formData.file) {
        console.log('*** Found image field instead of file field, adjusting...');
        formData.file = formData.image;
        delete formData.image;
      }
    } catch (err) {
      console.log('*** Error parsing form data:', err);
      return formatResponse(400, { message: "Invalid form data: " + err.message });
    }
    
    if (!formData || !(formData.file || formData.image)) {
      console.log('*** No file provided in request');
      console.log('*** Available fields:', formData ? Object.keys(formData).join(', ') : 'none');
      console.log('*** Dumping first 200 chars of body:', typeof event.body === 'string' ? event.body.substring(0, 200) : 'not a string');
      return formatResponse(400, { message: "No image file provided" });
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
    
    // Get the file buffer
    const fileBuffer = formData.file.buffer;
    
    // Validate the file buffer
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      console.log('*** Invalid file buffer:', fileBuffer);
      return formatResponse(400, { message: "Invalid file data" });
    }
    
    console.log(`*** Valid file buffer received with ${fileBuffer.length} bytes`);
    
    // Process the image
    console.log('*** Processing image synchronously');
    const processingResult = await processImageBuffer(fileBuffer);
    
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
    return formatResponse(500, { message: "Failed to upload image: " + error.message });
  }
};