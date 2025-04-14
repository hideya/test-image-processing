# Notes for Netlify Production Deployment

When deploying the application to Netlify production, be aware of these important considerations:

## 1. Stateless Architecture

The application now uses a fully stateless architecture optimized for Netlify Functions:

- No local file storage is used - all image processing happens in memory
- Processed images are returned directly as base64-encoded strings
- Database records no longer depend on file paths
- This eliminates the main limitation of Netlify's read-only filesystem

## 2. Function Size Limits

Netlify Functions have size limits:

- Default function size limit is 50MB (unzipped)
- OpenCV WASM module is relatively large, so be mindful of function size limits

## 3. Memory and Processing Time

- Netlify Functions have a memory limit (1024MB by default)
- Function execution timeout is 10 seconds by default (26 seconds max)
- Image processing with OpenCV can be memory-intensive, so test with realistic images
- The synchronous processing approach means the function must complete within the timeout limit

## 4. Database Migration

Before deploying, make sure the database schema is updated:

- Run the `netlify-migration.sql` script to update your database schema
- This removes the dependency on the `image_path` column
- Adds an index for faster lookups by `hash_key`

## 5. Bundle Configuration

For optimal packaging with esbuild, update your netlify.toml with:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

## 6. Deployment Testing

Before full deployment, test the functions in a staging environment to ensure:

- OpenCV WASM loads correctly
- Memory usage is within limits
- Processing time is acceptable
- Base64 encoding/decoding works as expected

## 7. Response Size Considerations

The new architecture includes image data in the API response:

- For large images, this can result in larger API responses
- Consider implementing compression options or size limits on the client side
- Monitor API response sizes during testing

## 8. Using OpenCV Efficiently

Optimizing OpenCV usage for Netlify Functions:

- Use the smallest possible image size that provides the needed accuracy
- Implement preprocessing steps to reduce the computational load
- Consider using a Sharp-based fallback for simpler cases

## 9. Alternative OpenCV Options

For more complex OpenCV processing that requires more memory or execution time, consider these alternatives:

1. **OpenCV-WASM with Optimizations**:
   - Focus on memory-efficient algorithms
   - Implement step-by-step processing with progress tracking
   - Test with maximum image sizes to determine limits

2. **External Processing Service**:
   - For very complex processing, consider offloading to a dedicated API
   - This can be a separate AWS Lambda or specialized image processing service
   - The Netlify Function would act as a proxy to this service

## 10. Client-Side Considerations

Update the client application to work with the new architecture:

- Handle longer initial processing time during upload
- Display appropriate loading indicators
- Process and display the base64 image data
- No need to implement polling for processing status
