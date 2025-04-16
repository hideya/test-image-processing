# Two-Step Image Upload and Metadata Workflow

This document describes the updated two-step workflow for image uploads and metadata management in the application. This workflow was implemented to improve the user experience by allowing users to make more informed decisions about metadata after seeing processing results.

## Overview

The application now uses a two-step approach for handling image uploads and metadata:

1. **Step 1**: Upload and process the image, returning angle measurements and results
2. **Step 2**: Review results and then add metadata (notes and icons)

This approach replaces the previous single-step workflow where users had to decide on metadata before seeing processing results.

## Benefits

The two-step workflow provides several advantages:

1. **Informed Decision Making**
   - Users can see angle measurements before deciding what notes to write
   - Icon selection can be more relevant to the actual results
   - Better context leads to more meaningful metadata

2. **Improved User Experience**
   - Users aren't forced to make decisions before seeing results
   - Less friction during the initial upload process
   - More intuitive workflow that follows users' natural thought process

3. **Better Data Quality**
   - Metadata is more likely to be relevant and accurate
   - Users may add more detailed notes with measurement context
   - Easier to correlate icons and notes with specific angle measurements

## Technical Implementation

### API Endpoints

The two-step workflow uses two separate API endpoints:

1. **Image Upload Endpoint**
   - URL: `/api/images/upload`
   - Method: `POST`
   - Purpose: Upload and process an image, return measurements and base64 image data
   - Request:
     ```
     FormData: {
       image: (binary file),
       customDate: (YYYY-MM-DD format),
       clientRotation: (rotation angle in degrees)
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "measurement": {
         "id": 123,
         "angle": 32.45,
         "angle2": 15.87,
         "date": "2023-06-15"
       },
       "image": {
         "id": 456,
         "hashKey": "a1b2c3d4e5f6g7h8i9j0"
       },
       "processedImage": {
         "base64": "...(base64 encoded image data)...",
         "mimeType": "image/jpeg"
       }
     }
     ```

2. **Metadata Update Endpoint**
   - URL: `/api/measurements/:id/metadata`
   - Method: `PATCH`
   - Purpose: Update an existing measurement with metadata (memo and icons)
   - Request:
     ```json
     {
       "memo": "This is a note about the measurement",
       "iconIds": [1, 2, 3]
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "measurement": {
         "id": 123,
         "angle": 32.45,
         "angle2": 15.87,
         "timestamp": "2023-06-15",
         "memo": "This is a note about the measurement",
         "iconIds": "1,2,3"
       }
     }
     ```

### Client-Side Implementation

The client-side implementation uses a step-based state machine to manage the workflow:

```typescript
enum UploadStep {
  INITIAL = 'initial',       // Image selection and date selection
  UPLOADING = 'uploading',   // Uploading and processing image
  RESULTS = 'results',       // Showing results and metadata form
  UPDATING = 'updating',     // Saving metadata
  COMPLETE = 'complete'      // All done
}
```

The UI adapts to each step to guide the user through the process:

1. **INITIAL**: Shows file input, date selection, and preview with rotation
2. **UPLOADING**: Shows loading state during upload and processing
3. **RESULTS**: Shows processed image, angle measurements, and metadata form
4. **UPDATING**: Shows loading state during metadata update
5. **COMPLETE**: Shows success message and option to start again

### Server-Side Implementation

On the server side, the implementation required:

1. **Modified upload endpoint** (`/api/images/upload`)
   - No longer requires memo or iconIds in the request
   - Creates measurement records without metadata initially
   - Returns measurement ID for the subsequent metadata update

2. **New metadata endpoint** (`/api/measurements/:id/metadata`)
   - Validates measurement ownership
   - Updates existing record with memo and iconIds
   - Returns updated measurement

3. **Storage utility updates**
   - Added `getMeasurementById` method to retrieve specific measurements
   - Added `updateMeasurementMetadata` method to update metadata fields
   - Removed legacy methods no longer needed for the new workflow

## Netlify Implementation

The two-step workflow is also implemented in the Netlify serverless functions:

1. **Netlify.toml Configuration**
   ```toml
   [[redirects]]
     from = "/api/measurements/:id/metadata"
     to = "/.netlify/functions/update-metadata/:id"
     status = 200
     force = true
   ```

2. **New update-metadata.js Function**
   - Handles PATCH requests for updating measurement metadata
   - Extracts measurement ID from URL parameters
   - Performs validation and updates database records

## Migration Notes

When migrating to the two-step workflow:

1. **Database Changes**
   - No schema changes were required
   - Existing records remain compatible

2. **Client Updates**
   - Updated upload component to support the two-step process
   - Modified mutation hooks to handle both API endpoints
   - Enhanced error handling for the two-step process

3. **Server Changes**
   - Added new metadata endpoint
   - Modified upload endpoint to not expect metadata
   - Removed legacy support methods

## Future Enhancements

Potential future enhancements to the two-step workflow:

1. **Deferred Metadata**
   - Allow saving measurements without metadata for later addition
   - Add a "measurements needing metadata" view

2. **Metadata Templates**
   - Save common metadata combinations as templates
   - Quick-apply templates to new measurements

3. **Batch Processing**
   - Upload multiple images at once
   - Apply metadata to multiple measurements in one operation
