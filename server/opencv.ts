/**
 * OpenCV integration for the server-side implementation
 * This module provides image processing capabilities using Sharp
 * as a temporary fallback while OpenCV/WASM integration is being implemented
 */

import sharp from 'sharp';

/**
 * Ensures that OpenCV is ready to use
 * In this version, we're just using Sharp, so this is a no-op
 */
export async function ensureOpenCVReady(): Promise<void> {
  console.log('OpenCV-WASM is not used in this version. Using Sharp instead.');
  return Promise.resolve();
}

/**
 * Process an image buffer and calculate angles
 * @param imageBuffer Raw image buffer
 * @returns Object containing angles and processed image buffer
 */
export async function processImageBuffer(imageBuffer: Buffer): Promise<{
  angle: number;
  angle2: number;
  processedImageBuffer: Buffer;
}> {
  try {
    console.log("Processing image from buffer");

    // Use Sharp for preprocessing and angle calculation
    // First create a processed version of the image (grayscale, enhanced)
    const processedImageBuffer = await preprocessImageBuffer(imageBuffer);
    
    // Get metadata from the processed image
    const metadata = await sharp(processedImageBuffer).metadata();
    
    const width = metadata.width || 100;
    const height = metadata.height || 100;
    
    // This is just a placeholder algorithm - replace with actual angle detection
    // when OpenCV integration is complete
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
  } catch (error) {
    console.error("Error processing image:", error);
    
    // Fallback to simple calculation
    try {
      // Use Sharp for fallback
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
 * @param imageBuffer Raw image buffer
 * @returns Processed image buffer
 */
async function preprocessImageBuffer(imageBuffer: Buffer): Promise<Buffer> {
  try {
    console.log("Preprocessing image buffer");
    
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

// Legacy file-based preprocessing functions - These are kept for backward compatibility
// but they should not be used in the new implementation

export async function preprocessImage(imagePath: string): Promise<string> {
  console.warn("Deprecated: Use preprocessImageBuffer instead");
  return Promise.resolve(imagePath);
}

export async function processImage(imagePath: string): Promise<{ angle: number; angle2: number }> {
  console.warn("Deprecated: Use processImageBuffer instead");
  return Promise.resolve({ angle: 0, angle2: 0 });
}
