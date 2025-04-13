# Notes for Netlify Production Deployment

When deploying the application to Netlify production, be aware of these important considerations:

## 1. Filesystem Access

Netlify Functions run in a stateless environment where the filesystem is read-only except for the `/tmp` directory. This means:

- You should modify the image processing code to save processed images to `/tmp` instead of the original directory
- Or, preferably, use a cloud storage solution like AWS S3 for storing processed images

## 2. Function Size Limits

Netlify Functions have size limits:

- Default function size limit is 50MB (unzipped)
- OpenCV WASM module is relatively large, so be mindful of function size limits

## 3. Memory and Processing Time

- Netlify Functions have a memory limit (1024MB by default)
- Function execution timeout is 10 seconds by default (26 seconds max)
- Image processing with OpenCV can be memory-intensive, so test with realistic images

## 4. Bundle Configuration

For optimal packaging with esbuild, update your netlify.toml with:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

## 5. Example Code Adjustment for Writable Directory

```javascript
// In your image processing functions, adjust paths:
const outputDir = process.env.NETLIFY ? '/tmp' : path.dirname(imagePath);
const outputPath = path.join(outputDir, processedFileName);
```

## 6. Deployment Testing

Before full deployment, test the functions in a staging environment to ensure:

- OpenCV WASM loads correctly
- Memory usage is within limits
- Processing time is acceptable
- File operations work as expected

## 7. Consider Lambda Integration

For more complex OpenCV processing that requires more memory or execution time, 
consider calling a dedicated AWS Lambda function from your Netlify Function.

## 8. Using Pre-built OpenCV Binaries for AWS Lambda

Since Netlify Functions run on AWS Lambda infrastructure, you can leverage pre-built OpenCV binaries specifically designed for Lambda environments. This approach might provide better performance than the WASM version.

### Steps to Use Pre-built OpenCV Binaries:

1. **Install the package**:
   ```bash
   npm install nodejs-opencv-aws-lambda-layer
   ```

2. **In your Netlify Function**:
   ```javascript
   const { opencvBinPath } = require('nodejs-opencv-aws-lambda-layer');
   
   // Set the environment variable before requiring opencv4nodejs
   process.env.OPENCV_BIN_DIR = opencvBinPath;
   const cv = require('opencv4nodejs');
   
   exports.handler = async function(event, context) {
     // Now you can use the full opencv4nodejs API with better performance
     // than the WASM version
     // ...
   }
   ```

3. **Configure Netlify build settings** to include the binaries:
   ```toml
   # netlify.toml
   [functions]
     directory = "netlify/functions"
     node_bundler = "esbuild"
     included_files = ["node_modules/nodejs-opencv-aws-lambda-layer/opencv-bin/**"]
   ```

4. **Optimize bundle size**:
   - Consider using individual functions for OpenCV processing to keep bundle sizes manageable
   - Use the `external_node_modules` option in netlify.toml to exclude certain dependencies from the bundle

### Advantages of Pre-built Binaries:

- Better performance than WASM version
- Full access to all OpenCV API features
- Native code execution speed
- Compatible with Netlify's Lambda environment

### Disadvantages:

- Larger bundle size
- More complex deployment configuration
- May exceed Netlify's function size limits for complex applications

This approach is recommended if your image processing requires high performance or advanced OpenCV features not readily available in the WASM version.