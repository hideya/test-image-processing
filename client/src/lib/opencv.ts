// Function to preprocess an image using HTML5 Canvas
export async function preprocessImage(imageElement: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element to render the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Determine if we need to rotate the image
      const isLandscape = imageElement.width > imageElement.height;
      
      // Set canvas dimensions based on orientation
      if (isLandscape) {
        // If landscape, rotate to portrait
        canvas.width = imageElement.height;
        canvas.height = imageElement.width;
        
        // Translate and rotate canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(
          imageElement, 
          -imageElement.width / 2, 
          -imageElement.height / 2, 
          imageElement.width, 
          imageElement.height
        );
        
        // Reset transformation
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        // If already portrait, just use normal dimensions
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      }
      
      // Resize the image while maintaining aspect ratio
      const targetWidth = 1024;
      const aspectRatio = canvas.height / canvas.width;
      const targetHeight = Math.round(targetWidth * aspectRatio);
      
      // Create a temporary canvas for resizing
      const resizeCanvas = document.createElement('canvas');
      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;
      const resizeCtx = resizeCanvas.getContext('2d')!;
      
      // Draw the original image at the new size
      resizeCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      
      // Convert canvas to Blob (JPEG format)
      resizeCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert image to blob"));
          }
        },
        'image/jpeg',
        0.85 // quality 85%
      );
    } catch (error) {
      reject(error);
    }
  });
}
