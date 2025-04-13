# Netlify Functions with Cloudflare R2 Storage

This document explains the changes made to migrate from local file storage to Cloudflare R2 for Netlify serverless functions.

## Changes Made

1. **R2 Client**: Created a utility to interact with Cloudflare R2 storage
   - Location: `/netlify/functions/utils/r2-client.js`
   - Uses AWS SDK for S3 to interact with R2 (which provides an S3-compatible API)

2. **Storage Module**: Updated `/netlify/functions/storage.js` to:
   - Store images in R2 instead of the local filesystem
   - Use virtual paths within R2 for organization
   - Maintain the same API for the rest of the application

3. **Image Endpoints**: Updated `/netlify/functions/images.js` to:
   - Fetch images from R2 instead of local filesystem
   - Return them as base64-encoded responses

4. **Dependencies**: Added AWS SDK dependencies for S3 compatibility

## Environment Variables

You need to set the following environment variables in your Netlify deployment:

```
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ENDPOINT=https://3fe42e55e5d4ec266d544a471a483b5a.r2.cloudflarestorage.com
R2_BUCKET_NAME=test-image-processing
```

## How to Get R2 Credentials

1. In your Cloudflare dashboard, navigate to R2
2. Go to "R2" > "Manage R2 API Tokens"
3. Create a new API token with read and write permissions for your bucket
4. Copy the Access Key ID and Secret Access Key

## Deployment Steps

1. Install required dependencies:
   ```
   node netlify-r2-dependencies.js
   npm install
   ```

2. Set up environment variables in Netlify:
   - Go to Netlify dashboard > Your site > Site settings > Environment variables
   - Add the R2 variables listed above

3. Deploy your application to Netlify

## R2 Storage Structure

Images are now stored in R2 using the following structure:

- Original images: `images/{hash}.{extension}`
- Medium-sized images: `mediums/{hash}.{extension}`

The database continues to store references to these paths.

## Testing

After deployment, test the following functionality:

1. Image upload
2. Viewing original images
3. Viewing medium-sized images

## Troubleshooting

If you encounter issues:

1. Check Netlify function logs
2. Verify R2 credentials are correctly set in environment variables
3. Ensure the R2 bucket exists and is properly configured
4. Check CORS configuration if uploading directly from the browser
