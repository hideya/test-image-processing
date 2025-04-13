// netlify/functions/opencv.js - Using opencv-wasm for compatibility

/**
 * IMPORTANT NOTICE: 
 * OpenCV is the primary and required image processing library for this project.
 * While Sharp is being used as a temporary fallback solution to keep the application
 * functional, the priority is to fully implement and use OpenCV for all image processing.
 * 
 * The current implementation using Sharp is TEMPORARY and should be replaced with
 * proper OpenCV implementations as soon as the API compatibility issues are resolved.
 *
 * See OPENCV_PRIORITY.md for more details.
 */

const sharp = require("sharp");

// Import opencv-wasm - this is compatible with Netlify Functions
let cv = null;
try {
  cv = require('opencv-wasm');
  console.log("OpenCV-WASM loaded successfully in Netlify function");
  
  // Log available methods to help with debugging
  console.log("OpenCV methods available:", Object.keys(cv).filter(key => typeof cv[key] === 'function').join(', '));
} catch (err) {
  console.error("Failed to load opencv-wasm:", err.message);
}

// Function to ensure OpenCV is ready and loaded
async function ensureOpenCVReady() {
  if (!cv) {
    try {
      cv = require('opencv-wasm');
      console.log("OpenCV-WASM loaded successfully on retry");
      
      // Log available methods to help with debugging
      console.log("OpenCV methods available:", Object.keys(cv).filter(key => typeof cv[key] === 'function').join(', '));
    } catch (err) {
      console.error("Failed to load opencv-wasm on retry:", err.message);
      throw new Error("Could not load OpenCV WASM module");
    }
  }
  
  console.log("Using OpenCV-WASM version:", cv.version || "unknown");
  return Promise.resolve();
}

/**
 * Process an image buffer and calculate angles
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Object} Object containing angles and processed image buffer
 */
async function processImageBuffer(imageBuffer) {
  try {
    console.log("Processing image from buffer");

    // Ensure OpenCV is ready
    await ensureOpenCVReady();

    try {
      // TODO: Replace this temporary Sharp implementation with proper OpenCV processing
      // once API compatibility issues are resolved
      console.warn("TEMPORARY FALLBACK: Using Sharp instead of OpenCV for angle calculation");
      
      // Use Sharp for preprocessing and angle calculation
      // First create a processed version of the image (grayscale, enhanced)
      const processedImageBuffer = await preprocessImageBuffer(imageBuffer);
      
      // Get metadata from the processed image
      const metadata = await sharp(processedImageBuffer).metadata();
      
      const width = metadata.width || 100;
      const height = metadata.height || 100;
      
      // This is just a placeholder algorithm - replace with actual angle detection
      // when OpenCV WASM issues are resolved
      const aspect = width / height;
      const angle1 = Math.min(35, Math.max(0, (aspect - 1) * 10));
      const angle2 = Math.min(35, Math.max(0, Math.abs(1 - aspect) * 15));
      
      console.log(`Calculated primary angle: ${angle1} degrees, secondary angle: ${angle2} degrees`);

      // Return everything in one object
      return { 
        angle: angle1, 
        angle2: angle2, 
        processedImageBuffer 
      };
    } catch (cvErr) {
      console.error("Processing error:", cvErr.message);
      throw cvErr; // Re-throw to trigger fallback
    }
  } catch (error) {
    console.error("Error processing image:", error);
    
    // Fallback to simple calculation
    try {
      // Use Sharp for fallback (TEMPORARY)
      const metadata = await sharp(imageBuffer, {
        failOnError: false,
      }).metadata();

      const width = metadata.width || 100;
      const height = metadata.height || 100;

      const angle1 = width % 5;
      const angle2 = height % 5;

      console.log(`Fallback to basic Sharp metadata: ${width}x${height}`);
      console.log(
        `Calculated primary angle: ${angle1} degrees, secondary angle: ${angle2} degrees`
      );

      // Create a basic processed image - just grayscale
      const processedImageBuffer = await sharp(imageBuffer)
        .grayscale()
        .toBuffer();

      return { 
        angle: angle1, 
        angle2: angle2, 
        processedImageBuffer 
      };
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Preprocess image buffer to prepare for angle calculation
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Buffer} Processed image buffer
 */
async function preprocessImageBuffer(imageBuffer) {
  try {
    console.log("Preprocessing image buffer");
    
    // TODO: Replace this temporary Sharp implementation with proper OpenCV processing
    // once API compatibility issues are resolved
    console.warn("TEMPORARY FALLBACK: Using Sharp instead of OpenCV for image processing");
    console.log("Using Sharp for image processing (TEMPORARY solution)");
    
    try {
      // Get image metadata to check orientation
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`Image metadata: width=${metadata.width}, height=${metadata.height}, orientation=${metadata.orientation}`);
      
      // Process the image, respecting original orientation
      // No automatic rotation to portrait, just apply processing
      const processedBuffer = await sharp(imageBuffer)
        .removeAlpha()  // Remove transparency if any
        .withMetadata() // Preserve metadata
        .grayscale()
        .sharpen()
        .toBuffer();
      
      // Verify the processing result by getting metadata
      const processedMeta = await sharp(processedBuffer).metadata();
      console.log(`Processed image metadata: width=${processedMeta.width}, height=${processedMeta.height}`);
      
      console.log("Successfully processed image buffer");
      return processedBuffer;
    } catch (sharpError) {
      console.error("Error during Sharp processing:", sharpError);
      console.log("Falling back to simple grayscale conversion");
      
      try {
        // Try a simpler approach with just grayscale
        const simpleProcessed = await sharp(imageBuffer)
          .grayscale()
          .toBuffer();
        
        console.log("Saved grayscale image buffer");
        return simpleProcessed;
      } catch (grayError) {
        console.error("Even simple grayscale conversion failed:", grayError);
        // Last resort fallback - just return the original buffer
        console.log("Using original image buffer as fallback");
        return imageBuffer;
      }
    }
  } catch (error) {
    console.error("Error preprocessing image:", error);
    throw error;
  }
}

/**
 * Generate a medium-sized version of an image (for thumbnail)
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {number} maxSize - Maximum width/height for the resized image
 * @returns {Buffer} Resized image buffer
 */
async function generateMediumImageBuffer(imageBuffer, maxSize = 800) {
  try {
    console.log(`Generating medium image (max size: ${maxSize}px)`);
    
    const resizedBuffer = await sharp(imageBuffer, {
      failOnError: false
    })
    .withMetadata({ orientation: 1 }) // Preserve orientation
    .resize({
      width: maxSize,
      height: maxSize,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toBuffer();
    
    console.log("Successfully generated medium-sized image");
    return resizedBuffer;
  } catch (error) {
    console.error("Error generating medium image:", error);
    // Return original if resize fails
    return imageBuffer;
  }
}

// Keep old functions for backward compatibility
async function processImage(imagePath) {
  console.log(`Legacy processImage called with path: ${imagePath}`);
  console.warn("This method is deprecated. Please use processImageBuffer instead.");
  
  const fs = require("fs");
  const imageBuffer = await fs.promises.readFile(imagePath);
  const result = await processImageBuffer(imageBuffer);
  
  return { angle: result.angle, angle2: result.angle2 };
}

async function preprocessImage(imagePath) {
  console.log(`Legacy preprocessImage called with path: ${imagePath}`);
  console.warn("This method is deprecated. Please use preprocessImageBuffer instead.");
  
  const fs = require("fs");
  const path = require("path");
  
  const imageBuffer = await fs.promises.readFile(imagePath);
  const processedBuffer = await preprocessImageBuffer(imageBuffer);
  
  // Save the processed buffer to a file
  const filename = path.basename(imagePath);
  const outputDir = path.dirname(imagePath);
  const processedFileName = `processed_${filename}`;
  const outputPath = path.join(outputDir, processedFileName);
  
  await fs.promises.writeFile(outputPath, processedBuffer);
  console.log(`Saved processed image to: ${outputPath}`);
  
  return outputPath;
}

module.exports = { 
  ensureOpenCVReady, 
  processImage, 
  preprocessImage,
  // New buffer-based functions:
  processImageBuffer,
  preprocessImageBuffer,
  generateMediumImageBuffer
};