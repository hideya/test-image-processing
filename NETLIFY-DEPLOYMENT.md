# Deploying to Netlify with Cloudflare R2 Integration

This guide explains how to deploy the application to Netlify with Cloudflare R2 integration.

## Prerequisites

1. Cloudflare account with R2 set up
2. Netlify account
3. Netlify CLI installed locally (`npm install -g netlify-cli`)

## Setup Steps

### 1. Install Dependencies

Make sure all dependencies for Netlify functions are installed:

```bash
cd netlify/functions
npm install
```

### 2. Set up Cloudflare R2 Credentials

1. In your Cloudflare dashboard, go to R2
2. Create an API token:
   - Go to "R2" > "Manage R2 API Tokens"
   - Create a token with read and write permissions for your bucket

3. You will need the following information:
   - Access Key ID
   - Secret Access Key
   - Account ID (part of your R2 endpoint)
   - Bucket name ("test-image-processing")

### 3. Configure Netlify Environment Variables

Set up the following environment variables in your Netlify site dashboard under Site settings > Environment variables:

```
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://3fe42e55e5d4ec266d544a471a483b5a.r2.cloudflarestorage.com
R2_BUCKET_NAME=test-image-processing
JWT_SECRET=your_jwt_secret_key_here
```

Ensure your JWT_SECRET matches what was used in your existing environment.

### 4. Deploy to Netlify

You can deploy using the Netlify CLI:

```bash
netlify login
netlify init
netlify deploy --prod
```

Or connect your GitHub repository to Netlify for continuous deployment.

## Testing the Deployment

After deploying, test the following functionality:

1. User authentication (login)
2. Image uploads
3. Image retrieval (both original and medium sizes)

## Troubleshooting

If you encounter issues:

1. Check Netlify function logs in the Netlify dashboard
2. Verify environment variables are correctly set
3. Ensure Cloudflare R2 bucket permissions are correct
4. Check CORS settings if needed
5. Confirm that AWS SDK dependencies are properly installed

### Common Issues

#### 502 Bad Gateway Errors
This often means there's an error in your function code. Check the function logs for more details.

#### Authentication Issues
Make sure your JWT_SECRET environment variable is properly set.

#### R2 Connection Problems
Verify your R2 credentials and bucket name are correct.
