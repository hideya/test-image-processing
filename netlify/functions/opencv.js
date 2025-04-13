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

const path = require("path");
const fs = require("fs");
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

// Function to process image and calculate angles
async function processImage(imagePath) {
  try {
    console.log(`Processing image: ${imagePath}`);

    // Ensure OpenCV is ready
    await ensureOpenCVReady();

    try {
      // TODO: Replace this temporary Sharp implementation with proper OpenCV processing
      // once API compatibility issues are resolved
      console.warn("TEMPORARY FALLBACK: Using Sharp instead of OpenCV for angle calculation");
      
      // Use Sharp for angle calculation for now while debugging OpenCV
      const metadata = await sharp(imagePath).metadata();
      
      const width = metadata.width || 100;
      const height = metadata.height || 100;
      
      // This is just a placeholder algorithm - replace with actual angle detection
      // when OpenCV WASM issues are resolved
      const aspect = width / height;
      const angle1 = Math.min(35, Math.max(0, (aspect - 1) * 10));
      const angle2 = Math.min(35, Math.max(0, Math.abs(1 - aspect) * 15));
      
      console.log(`Calculated primary angle: ${angle1} degrees, secondary angle: ${angle2} degrees`);

      return { angle: angle1, angle2: angle2 };
    } catch (cvErr) {
      console.error("Processing error:", cvErr.message);
      throw cvErr; // Re-throw to trigger fallback
    }
  } catch (error) {
    console.error("Error processing image:", error);
    // Fallback to simple calculation
    try {
      // Read the buffer directly to avoid any rotation issues
      const imageBuffer = await fs.promises.readFile(imagePath);

      // Use Sharp for fallback (TEMPORARY)
      const metadata = await sharp(imageBuffer, {
        failOnError: false,
      })
        .metadata();

      const width = metadata.width || 100;
      const height = metadata.height || 100;

      const angle1 = width % 5;
      const angle2 = height % 5;

      console.log(`Fallback to basic Sharp metadata: ${width}x${height}`);
      console.log(
        `Calculated primary angle: ${angle1} degrees, secondary angle: ${angle2} degrees`,
      );

      return { angle: angle1, angle2: angle2 };
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError);
      throw error; // Throw the original error
    }
  }
}

// Function to preprocess image before analysis
async function preprocessImage(imagePath) {
  try {
    console.log(`Starting preprocessing for image: ${imagePath}`);
    const filename = path.basename(imagePath);
    const outputDir = path.dirname(imagePath);
    const processedFileName = `processed_${filename}`;
    const outputPath = path.join(outputDir, processedFileName);
    
    console.log(`Will save processed image to: ${outputPath}`);
    
    // Note: Netlify Functions are stateless with read-only filesystem
    // For production, you would need to use a service like S3 instead of local files
    // This implementation works for development or if you're using a writable /tmp directory
    
    // TODO: Replace this temporary Sharp implementation with proper OpenCV processing
    // once API compatibility issues are resolved
    console.warn("TEMPORARY FALLBACK: Using Sharp instead of OpenCV for image processing");
    console.log("Using Sharp for image processing (TEMPORARY solution)");
    
    try {
      // Get image metadata to check orientation
      const metadata = await sharp(imagePath).metadata();
      console.log(`Image metadata: width=${metadata.width}, height=${metadata.height}, orientation=${metadata.orientation}`);
      
      // Read the file contents
      const fileContents = await fs.promises.readFile(imagePath);
      
      // Process the image, respecting original orientation
      // No automatic rotation to portrait, just apply processing
      await sharp(fileContents)
        .removeAlpha()  // Remove transparency if any
        .withMetadata() // Preserve metadata
        .grayscale()
        .sharpen()
        .toFile(outputPath);
      
      // Verify the processing result
      const processedMetadata = await sharp(outputPath).metadata();
      console.log(`Processed image metadata: width=${processedMetadata.width}, height=${processedMetadata.height}, orientation=${processedMetadata.orientation}`);
      
      console.log(`Successfully processed and saved image to: ${outputPath}`);
    } catch (sharpError) {
      console.error("Error during Sharp processing:", sharpError);
      console.log("Falling back to simple grayscale conversion");
      
      try {
        // Try a simpler approach with just grayscale
        await sharp(imagePath)
          .grayscale()
          .toFile(outputPath);
        
        console.log(`Saved grayscale image to: ${outputPath}`);
      } catch (grayError) {
        console.error("Even simple grayscale conversion failed:", grayError);
        // Last resort fallback - just copy the file as-is
        await fs.promises.copyFile(imagePath, outputPath);
        console.log(`Copied original image to: ${outputPath}`);
      }
    }
    
    return outputPath;
  } catch (error) {
    console.error("Error preprocessing image:", error);
    throw error;
  }
}

module.exports = { ensureOpenCVReady, processImage, preprocessImage };