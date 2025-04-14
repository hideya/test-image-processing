# Netlify Deployment Troubleshooting

This document provides solutions for common issues encountered when deploying the application to Netlify.

## Form Data Parsing Issues

When uploading images to Netlify Functions, you might encounter errors related to form data parsing.

### Symptoms

Error message in Netlify logs:
```
Error parsing form data: SyntaxError: Unexpected token 'L', "LS0tLS0tV2"... is not valid JSON
```

### Cause

This error occurs because Netlify Functions handle multipart form data differently than local development servers:

1. The content-type header might be processed differently
2. The function tries to parse the body as JSON when it's actually multipart form data
3. The "LS0tLS0tV2" is the base64 representation of a multipart form boundary

### Solution

The solution is to improve the form data detection and parsing logic:

1. Check both the content-type header and the body format
2. Use a fallback approach that tries multipart parsing if JSON parsing fails
3. Add more detailed logging to diagnose the issue

```javascript
// Improved form data parsing
try {
  // Check content-type header first
  const contentType = event.headers['content-type'] || '';
  console.log('*** Content-Type:', contentType);
  
  // If the event body is a string and either content-type includes multipart/form-data or body starts with boundary
  if (typeof event.body === 'string' && 
      (contentType.includes('multipart/form-data') || event.body.startsWith('--'))) {
    console.log('*** Detected multipart form data');
    formData = parseMultipartForm(event);
  } else if (typeof event.body === 'string') {
    // Try to parse as JSON if it's not multipart
    try {
      console.log('*** Attempting to parse as JSON');
      formData = JSON.parse(event.body);
    } catch (err) {
      console.log('*** Cannot parse as JSON, attempting multipart parse as fallback');
      formData = parseMultipartForm(event);
    }
  } else {
    // Assume it's already an object
    console.log('*** Using body directly as object');
    formData = event.body;
  }
} catch (err) {
  console.log('*** Error parsing form data:', err);
  return formatResponse(400, { message: "Invalid form data" });
}
```

## Memory Usage & Timeouts

### Symptoms

- Function execution timeouts after 10 seconds
- "Memory usage exceeded" errors
- Incomplete or failed image processing

### Causes

1. Netlify Functions have memory limits (1024MB by default)
2. Function execution timeout is 10 seconds by default (26 seconds maximum)
3. Image processing with OpenCV can be memory and CPU intensive

### Solutions

#### 1. Optimize image size before upload

The client should resize and compress images before uploading:
```javascript
// Client-side image optimization
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const MAX_DIMENSION = 1024;

// Set canvas dimensions while maintaining aspect ratio
if (width > height) {
  canvas.width = Math.min(width, MAX_DIMENSION);
  canvas.height = (height / width) * canvas.width;
} else {
  canvas.height = Math.min(height, MAX_DIMENSION);
  canvas.width = (width / height) * canvas.height;
}

// Draw and compress the image
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
canvas.toBlob(callback, 'image/jpeg', 0.85);
```

#### 2. Configure function limits

In `netlify.toml`, increase the function memory and timeout:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  included_files = []
  external_node_modules = []
  
  [functions.images-upload]
    memory = 1024  # MB
    timeout = 26   # seconds (maximum allowed)
```

#### 3. Implement progressive processing

For complex processing, consider implementing a progressive approach:
- First return a quick response with basic processing
- Then use a webhook or background function for advanced processing

## Database Connection Issues

### Symptoms

- Errors connecting to the database in Netlify Functions
- "Connection timeout" or "Connection refused" errors

### Solutions

1. Verify environment variables are correctly set in Netlify UI
2. Ensure your database accepts connections from Netlify's IP ranges
3. Use connection pooling with appropriate limits
4. Make sure you're using the serverless-compatible database driver

Example:
```javascript
// For PostgreSQL with Neon
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// For regular PostgreSQL
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000
});
```

## CORS Issues

### Symptoms

- Browser console errors about CORS
- Unable to make requests from client to Netlify Functions

### Solution

Ensure CORS headers are properly set in your function responses:

```javascript
// In auth-utils.js or similar utility file
function handleOptions() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400'
    }
  };
}

// In each function
if (event.httpMethod === "OPTIONS") {
  return handleOptions();
}
```

## General Debugging Tips

1. **Enable detailed logging**: Add extensive console.log statements to track the execution flow.

2. **Check function logs in Netlify UI**: Go to Functions > Your Function > View logs.

3. **Test functions locally first**: Use Netlify CLI to test functions locally before deploying:
   ```bash
   netlify dev
   ```

4. **Examine raw request data**: Log headers, request method, body, and query parameters to identify issues.

5. **Test with curl or Postman**: Test API endpoints directly to isolate client-side issues.

6. **Verify environment variables**: Double-check all environment variables are set correctly in Netlify.

7. **Deploy to a preview branch**: Test changes in a preview deployment before updating production.
