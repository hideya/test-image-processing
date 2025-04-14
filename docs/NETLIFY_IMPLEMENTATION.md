# Netlify Serverless Implementation

This document explains the changes made to optimize the application for Netlify's serverless functions.

## Major Changes

### 1. Removed Local File Storage Dependency

The original implementation saved uploaded images to local storage. This doesn't work with serverless functions because:
- Netlify Functions are stateless and ephemeral
- Each function execution runs in an isolated environment
- Files created during execution aren't accessible after the function completes

### 2. New Image Processing Flow

**Old Flow:**
1. Client uploads image → Server stores locally
2. Server responds immediately with hashKey (async processing starts)
3. Server processes image asynchronously (calculates angles)
4. Client later requests processed image/angles using the hashKey

**New Flow:**
1. Client uploads image
2. Server processes image synchronously (calculates angles)
3. Server responds with both processed image data (base64) and angle data
4. No local storage needed

### 3. File-Based vs Buffer-Based Processing

- Modified OpenCV module to work with image buffers instead of file paths
- Added new methods that operate on buffers directly
- Maintained backward compatibility for local development

## Implementation Details

### Updated Files:

1. **opencv.js**
   - Added buffer-based processing functions
   - Maintained file-based functions for backward compatibility
   - Improved error handling

2. **images-upload.js**
   - Modified to process images synchronously
   - Returns processed image as base64 along with angle data
   - No longer saves files to local storage

3. **storage.js**
   - Added method to create image records without file paths
   - Maintains database references using hashKeys

4. **schema.js**
   - Made imagePath field optional
   - Updated insert schema

5. **images.js**
   - Updated to handle missing physical files
   - Returns redirection to client with update message

### Database Migration

A migration script (`netlify-migration.sql`) was created to:
- Make the image_path column nullable
- Add an index for faster lookups by hash_key

Run this script on your database before deploying the updated code.

## Client-Side Changes Required

The client application needs to be updated to:
1. Handle longer initial upload/processing time (show spinner)
2. Process the base64 image data returned from the upload endpoint
3. No longer fetch images separately using the hashKey

## Benefits

1. Works with Netlify's stateless infrastructure
2. Simpler architecture (fewer API calls)
3. Better user experience (even with slightly longer initial upload time)
4. More portable across serverless platforms
5. Eliminates complexity of managing temporary files

## Backward Compatibility

For local development and testing, the original methods are still available. However, for production deployment on Netlify, the new buffer-based approach is recommended.
