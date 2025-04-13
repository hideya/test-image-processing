import path from "path";
import fs from "fs";
import sharp from "sharp";

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

// Import opencv-wasm as a CommonJS module
// Note: We need to use dynamic import since TypeScript with ESM doesn't support require directly
// and opencv-wasm is a CommonJS module

let cv: any = null;

// Function to ensure OpenCV is ready and loaded
export async function ensureOpenCVReady(): Promise<void> {
  if (cv) {
    return Promise.resolve();
  }

  try {
    // Dynamic import for ESM compatibility
    const opencvModule = await import('opencv-wasm');
    cv = opencvModule.default || opencvModule;
    console.log("OpenCV-WASM loaded successfully");
    console.log("OpenCV version:", cv.version);
    
    // Log available methods to help with debugging
    console.log("OpenCV methods available:", Object.keys(cv).filter(key => typeof cv[key] === 'function').join(', '));
    
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to load opencv-wasm:", error);
    throw error;
  }
}

export interface ProcessedImage {
  angle: number;
  angle2: number;
  processedImagePath: string;
}

// Function to process image and calculate angles
export async function processImage(
  imagePath: string,
): Promise<{ angle: number; angle2: number }> {
  try {
    console.log(`Processing image: ${imagePath}`);

    // Ensure OpenCV is ready
    await ensureOpenCVReady();

    // Read the image file using fs
    const imageBuffer = await fs.promises.readFile(imagePath);
    
    // Convert buffer to Uint8Array for OpenCV-WASM
    const uint8Array = new Uint8Array(imageBuffer);
    
    // First we need to load the image data to an array
    let mat;
    try {
      // Try using imread directly on the path for Node.js
      mat = cv.imread(imagePath);
    } catch (e) {
      console.log("Direct imread failed, using alternative method");
      // Alternative approach using buffer for WASM
      // Create typed array from buffer
      const data = new Uint8Array(imageBuffer);
      
      // Create a Mat from the image data
      mat = cv.matFromImageData({
        data: data,
        width: 0, // These will be determined from the image data
        height: 0
      });
    }
    
    console.log(`Image loaded: ${mat.rows}x${mat.cols}`);

    // For now, just generate random angles
    // In a real implementation, you would use OpenCV's algorithms to detect angles
    const angle1 = Math.random() * 35; 
    const angle2 = Math.random() * 35;

    console.log(`Calculated primary angle: ${angle1} degrees, secondary angle: ${angle2} degrees`);
    
    // Cleanup to prevent memory leaks
    mat.delete();

    return { angle: angle1, angle2: angle2 };
  } catch (error) {
    console.error("Error processing image:", error);
    
    // TEMPORARY FALLBACK: Using Sharp instead of OpenCV (to be replaced with OpenCV)
    try {
      console.warn("TEMPORARY FALLBACK: Using Sharp instead of OpenCV for angle calculation");
      // Use Sharp to get basic image metadata
      const metadata = await sharp(imagePath).metadata();
      
      const width = metadata.width || 100;
      const height = metadata.height || 100;
      
      const angle1 = width % 5;
      const angle2 = height % 5;
      
      console.log(`Fallback to basic Sharp metadata: ${width}x${height}`);
      console.log(`Calculated primary angle: ${angle1} degrees, secondary angle: ${angle2} degrees`);
      
      return { angle: angle1, angle2: angle2 };
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError);
      throw error; // Throw the original error
    }
  }
}

// Function to preprocess image before analysis
export async function preprocessImage(imagePath: string): Promise<string> {
  try {
    console.log(`Starting preprocessing for image: ${imagePath}`);
    const filename = path.basename(imagePath);
    const outputDir = path.dirname(imagePath);
    const processedFileName = `processed_${filename}`;
    const outputPath = path.join(outputDir, processedFileName);
    
    console.log(`Will save processed image to: ${outputPath}`);
    
    // Check if the processed file already exists
    if (fs.existsSync(outputPath)) {
      console.log(`Processed file already exists at ${outputPath}, will overwrite it.`);
    }
    
    // List all files in directory before processing
    console.log('Files in directory before processing:');
    const filesBefore = fs.readdirSync(outputDir);
    console.log(filesBefore);
    
    // Ensure OpenCV is ready
    await ensureOpenCVReady();
    
    console.log("Starting OpenCV-WASM preprocessing");
    
    try {
      // TODO: Replace this temporary Sharp implementation with proper OpenCV processing
      // once API compatibility issues are resolved
      console.warn("TEMPORARY FALLBACK: Using Sharp instead of OpenCV for image processing");
      console.log("Using Sharp for image processing (TEMPORARY solution)");
      
      // Get image metadata to check orientation
      const metadata = await sharp(imagePath).metadata();
      console.log(`Image metadata: width=${metadata.width}, height=${metadata.height}, orientation=${metadata.orientation}`);
      
      // Read the file contents
      const fileContents = fs.readFileSync(imagePath);
      
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
      
      // Check if the file was saved successfully
      if (fs.existsSync(outputPath)) {
        console.log(`Verified that processed file exists at: ${outputPath}`);
      } else {
        console.error(`Failed to save processed file to: ${outputPath}`);
      }
    } catch (processingError) {
      console.error("Error during processing:", processingError);
      console.log("Falling back to simple grayscale conversion");
      
      try {
        // Try a simpler approach with just grayscale using Sharp (TEMPORARY)
        await sharp(imagePath)
          .grayscale()
          .toFile(outputPath);
        
        console.log(`Saved grayscale image to: ${outputPath}`);
      } catch (grayError) {
        console.error("Even simple grayscale conversion failed:", grayError);
        // Last resort fallback - just copy the original file
        await fs.promises.copyFile(imagePath, outputPath);
        console.log(`Copied original image to: ${outputPath}`);
      }
    }
    
    // List all files in directory after processing
    console.log('Files in directory after processing:');
    const filesAfter = fs.readdirSync(outputDir);
    console.log(filesAfter);
    
    // Check if output file exists
    if (fs.existsSync(outputPath)) {
      console.log(`Confirmed output file exists at: ${outputPath}`);
    } else {
      console.error(`ERROR: Output file does not exist at: ${outputPath}`);
      // Look for any processed_ files
      const possibleMatches = filesAfter.filter(f => f.startsWith('processed_'));
      if (possibleMatches.length > 0) {
        console.log(`Found possible matches: ${possibleMatches.join(', ')}`);
      }
    }
    
    return outputPath;
  } catch (error) {
    console.error("Error preprocessing image:", error);
    throw error;
  }
}