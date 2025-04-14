# JWT Authentication Usage Guide

This document provides guidance on how JWT authentication is implemented in this application and how to debug common issues.

## Authentication Flow

1. **Login**: 
   - User submits credentials to `/api/login`
   - Server validates and returns a JWT token
   - Client stores the token in localStorage under key 'auth_token'

2. **API Requests**:
   - For most regular API requests, use the `apiRequest` function from `queryClient.ts`
   - This function automatically adds the Authorization header with the token

3. **File Uploads**:
   - File uploads (FormData) need special handling
   - Manually add Authorization header:
   ```typescript
   const token = getAuthToken();
   const headers: Record<string, string> = {};
   
   if (token) {
     headers['Authorization'] = `Bearer ${token}`;
   }
   
   fetch("/api/endpoint", {
     method: "POST",
     headers,
     body: formData,
   });
   ```

## Common Issues and Debugging

### 401 Unauthorized Error

If you're getting 401 errors, check:

1. **Token Presence**: 
   - Open browser devtools
   - Go to Application > Storage > Local Storage
   - Verify 'auth_token' exists and has a value

2. **Token in Request**:
   - In devtools Network tab, find the failing request
   - Check if it has an Authorization header with "Bearer [token]"
   
3. **Server Token Validation**:
   - Check server logs for token verification errors
   - Ensure JWT_SECRET is consistent between environments

### Handling FormData Requests

Important: When using FormData (for file uploads, etc.), always manually add the Authorization header:

```javascript
// DON'T set Content-Type for FormData - the browser sets the correct multipart boundary
const headers = {
  'Authorization': `Bearer ${getAuthToken()}`
};

fetch("/api/endpoint", {
  method: "POST",
  headers,
  body: formData
});
```

## Authentication Helpers

Always use the helper functions from `queryClient.ts`:

```javascript
import { getAuthToken, setAuthToken, clearAuthToken } from '../lib/queryClient';

// Get token
const token = getAuthToken();

// Set token
setAuthToken(token);

// Clear token (logout)
clearAuthToken();
```

Never directly access localStorage for auth tokens.
