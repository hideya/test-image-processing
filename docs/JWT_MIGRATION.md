# JWT Authentication Migration

This document outlines the changes made to migrate the application from session-based authentication to JWT-based authentication.

## Architecture Changes

1. **Authentication Method**: 
   - Removed session-based authentication with Passport.js
   - Implemented JWT (JSON Web Token) authentication
   - Tokens are stored in localStorage on the client side

2. **Server Changes**:
   - Added `auth-jwt.ts` which implements JWT generation and verification
   - Removed Passport.js dependencies and session management 
   - Updated authentication middleware to use token verification

3. **Client Changes**:
   - The client was already partially configured for JWT authentication
   - Enhanced token management and error handling

## Files Modified

### New Files:
- `/server/auth-jwt.ts` - Handles JWT auth functionality

### Updated Files:
- `/server/index.ts` - Now uses JWT auth
- `/server/routes.ts` - Updated to use JWT middleware
- `/client/src/lib/queryClient.ts` - Improved error handling
- `/client/src/hooks/use-auth.tsx` - Enhanced JWT support

## Authentication Flow

1. **Login/Registration**:
   - Client sends username/password to server
   - Server validates credentials
   - On success, server returns a JWT token
   - Client stores token in localStorage

2. **Authentication**:
   - Client includes token in `Authorization: Bearer <token>` header with each request
   - Server verifies token using JWT_SECRET
   - Server attaches user data to request object after verification

3. **Logout**:
   - Client removes token from localStorage
   - Server endpoint `/api/logout` exists for compatibility but does nothing server-side
   
## Security Considerations

- JWT_SECRET is set in the .env file
- Token expiration is set to 7 days
- Invalid tokens are automatically cleared from localStorage
- Sensitive information (like passwords) is never included in tokens

## Next Steps

1. **Clean Up Session Code**:
   - Remove unused session-related dependencies
   - Clean up any remaining session middleware

2. **Testing**:
   - Thoroughly test login, registration, and authentication flows
   - Verify that protected routes work correctly

3. **Future Enhancements**:
   - Implement token refresh functionality
   - Add token blacklisting/revocation (if needed)
