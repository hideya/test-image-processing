# Photo Analyzer WebApp Technical Specifications

This document provides detailed technical specifications for the Photo Analyzer WebApp, including database schema, API endpoints, authentication mechanisms, and image processing workflow.

## Database Schema

The application uses PostgreSQL with Drizzle ORM and includes the following tables:

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
```

### Images Table
```sql
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  image_path TEXT NOT NULL,
  hash_key TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  processed_angle REAL,
  processed_angle2 REAL,
  is_processed BOOLEAN DEFAULT FALSE
);
```

### Angle Measurements Table
```sql
CREATE TABLE angle_measurements (
  id SERIAL PRIMARY KEY,
  image_id INTEGER NOT NULL REFERENCES images(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  angle REAL NOT NULL,
  angle2 REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  memo TEXT,
  icon_ids TEXT
);
```

### Session Table (Legacy - used by older versions)
```sql
CREATE TABLE session (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire TIMESTAMP NOT NULL
);
```

## Table Relationships

The database schema includes the following relationships:

1. **User to Images**: One-to-many relationship. A user can have multiple images.
2. **User to Angle Measurements**: One-to-many relationship. A user can have multiple angle measurements.
3. **Image to Angle Measurements**: One-to-many relationship. An image can have multiple angle measurements.
4. **Image to User**: Many-to-one relationship. Multiple images can belong to a single user.
5. **Angle Measurement to User**: Many-to-one relationship. Multiple angle measurements can belong to a single user.
6. **Angle Measurement to Image**: Many-to-one relationship. Multiple angle measurements can belong to a single image.

## Authentication and Security

### Authentication Flow

1. **Registration**: New users register with username, email, and password
2. **Password Hashing**: Passwords are securely hashed using Node.js crypto scrypt function with salt
3. **JWT Authentication**: JSON Web Tokens used for stateless authentication
4. **Login Process**: Successful authentication returns a JWT token stored in the client's localStorage
5. **Token Verification**: Requests include the token in Authorization header for verification

### Security Mechanisms

1. **Password Security**:
   - Passwords are hashed using scrypt with a unique salt for each user
   - Timing-safe comparison used to prevent timing attacks
   - Original passwords are never stored or transmitted

2. **JWT Security**:
   - Server-side token verification before processing protected requests
   - Token expiration set to 7 days by default
   - Tokens store only non-sensitive user information
   - JWT_SECRET environment variable used for signing tokens

3. **API Security**:
   - Authentication middleware (`authenticateJWT`) protects all sensitive routes
   - User-specific access control for private resources
   - API routes verify user authorization before providing access to resources

### Authentication Middleware

```typescript
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Set user information in request
  req.user = payload;
  next();
}
```

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Authentication Required | Request Body | Response |
|----------|--------|-------------|-------------------------|--------------|----------|
| `/api/register` | POST | Register a new user | No | `{ username, email, password }` | User object and JWT token |
| `/api/login` | POST | Login a user | No | `{ username, password }` | User object and JWT token |
| `/api/logout` | POST | Logout a user (client-side only) | No | None | Status 200 |
| `/api/user` | GET | Get current user | Yes | None | User object |

### Image Management Endpoints

| Endpoint | Method | Description | Authentication Required | Request Body | Response |
|----------|--------|-------------|-------------------------|--------------|----------|
| `/api/images/upload` | POST | Upload an image | Yes | FormData with `image`, `customDate`, `rotation` | Image metadata with processing status |
| `/api/images/:hashKey` | GET | Get image by hash key | Yes | None | Image file |
| `/api/images/:hashKey/original` | GET | Get original image | Yes | None | Original image file |
| `/api/images/:hashKey/medium` | GET | Get medium sized image | Yes | None | Medium sized image file |

### Data Endpoints

| Endpoint | Method | Description | Authentication Required | Query Parameters | Response |
|----------|--------|-------------|-------------------------|------------------|----------|
| `/api/angle-data` | GET | Get angle measurements | Yes | `start`, `end` (ISO date strings) | Array of measurements with dates |
| `/api/latest-angle` | GET | Get the latest angle measurement | Yes | None | Latest measurement object |

## Client-Side Image Upload Flow

The client-side image upload process incorporates both client-side and server-side image processing:

1. **Image Selection**:
   - User selects an image file via file input
   - The app validates the file type (only jpeg, jpg, png allowed)
   - A preview is generated using `FileReader.readAsDataURL()`

2. **Pre-Upload Processing**:
   - Client creates a preview with manual rotation options
   - User can rotate the image in 90-degree increments
   - A date picker allows assigning a custom date to the measurement

3. **Client-Side Optimization**:
   - Image is resized to a maximum dimension of 1024px (maintaining aspect ratio)
   - Converted to JPEG format with 85% quality for bandwidth optimization
   - Rotation is applied before upload

4. **Upload Process**:
   - FormData object is created with:
     - Processed image file
     - Custom date (ISO format with time set to noon to avoid timezone issues)
     - Rotation angle
   - JWT token is added to the Authorization header
   - Submitted to `/api/images/upload` endpoint
   - Upload progress is indicated with loading animation

5. **Handling Server Response**:
   - On success, displays confirmation and begins polling for processing status
   - Polls `/api/latest-angle` at 2-second intervals to check processing completion
   - Updates UI with processing state indicators
   - Auto-refreshes measurements list once processing completes
   - Preloads medium-sized image for faster display

6. **Error Handling**:
   - Client displays appropriate error messages for various failure cases
   - Handles network errors, invalid files, and server processing failures
   - Allows retry on failure

7. **Medium Image Caching**:
   - Implements client-side caching system for medium-sized images
   - Uses a combination of state management and browser caching
   - Improves performance for repeated image views

## Server-Side Image Processing

The server employs a sophisticated image processing pipeline:

1. **Upload Handling**:
   - Uses multer middleware for multipart/form-data parsing
   - Validates file type and size constraints
   - Generates a unique hash key for the image

2. **Image Storage**:
   - Support for both local file storage and Cloudflare R2 cloud storage
   - Creates appropriate storage structure based on configuration
   - Uses hash-based filenames to prevent collisions

3. **Medium Image Generation**:
   - Creates optimized medium-sized images (preserving aspect ratio)
   - Used for display in the application UI
   - Applies quality optimization for size reduction

4. **Angle Detection**:
   - Processes image with OpenCV algorithms to detect lines and angles
   - Implements edge detection and Hough transform
   - Calculates two dominant angles in the image
   - Applies user-specified rotation before processing

5. **Data Storage**:
   - Stores image metadata in the database
   - Creates angle measurement records linked to images and users
   - Supports custom timestamp assignment for historical data
   - Stores optional memo text and icon IDs for better categorization

6. **Cache Management**:
   - Sets appropriate cache control headers for different image types
   - Prevents browser caching issues with appropriate headers
   - Implements etag support for efficient network usage

## Netlify Serverless Functions

The application is designed to run both as a traditional Node.js server and as a serverless application on Netlify:

1. **Function Structure**:
   - Individual JavaScript functions in the `/netlify/functions` directory
   - Each function handles a specific API endpoint or related group of endpoints
   - Configuration in `netlify.toml` maps API routes to functions

2. **Authentication in Functions**:
   - JWT authentication is implemented in functions using the same pattern as the server
   - Token verification and user extraction are consistent between environments

3. **Database Access**:
   - Functions connect to the same PostgreSQL database as the server
   - Uses the `@neondatabase/serverless` driver for optimized database connections

4. **Image Processing**:
   - Image processing is available in functions for complete functionality
   - Uses the same OpenCV bindings for consistent results

## Development and Deployment Notes

### Environment Variables

The application requires the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing

For Cloudflare R2 storage (optional):
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key ID
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret access key
- `R2_ENDPOINT`: Cloudflare R2 endpoint URL
- `R2_BUCKET_NAME`: Cloudflare R2 bucket name

### File Storage Considerations

- If using local storage, ensure the `uploads` directory and its subdirectories exist and are writable
- Required subdirectories:
  - `uploads/originals`: Original uploaded images
  - `uploads/processed`: Processed images with annotations
  - `uploads/mediums`: Medium-sized images for display

### Performance Optimizations

1. **Image Processing**:
   - Server-side image resize before OpenCV processing
   - Asynchronous processing with immediate response
   - Support for cloud storage with Cloudflare R2

2. **Response Time**:
   - Client-side image and data caching
   - Medium image preloading for expanded views
   - Efficient queries with proper indices

3. **Data Loading**:
   - Month-based data queries for efficient loading
   - Optimized rendering with React hooks
   - Chart data pre-processing for smooth visualization