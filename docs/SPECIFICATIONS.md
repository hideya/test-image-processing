# Photo Analyzer WebApp Technical Specifications

This document provides detailed technical specifications for the Photo Analyzer WebApp, including database schema, API endpoints, authentication mechanisms, and image processing workflow.

## Date Handling Standards

The application uses standardized date handling across all components:

1. **API Communication**:
   - All API endpoints exclusively use YYYY-MM-DD format for dates
   - Date validation enforces this format with regex pattern checks
   - No exceptions or fallbacks to other date formats are provided

2. **Database Storage**:
   - Dates are stored as PostgreSQL timestamp with time set to noon (12:00:00)
   - Setting to noon prevents timezone-related date shifts
   - Queries compare only date parts when filtering by date

3. **Date Utilities**:
   - The client uses a shared date utility module for consistent handling
   - Helper functions enforce the YYYY-MM-DD format standard
   - Date comparisons normalize to midnight to avoid time component issues

See the [Date Standardization](DATE_STANDARDIZATION.md) document for details on implementation and best practices for date handling.

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
| `/api/images/upload` | POST | Upload and process an image | Yes | FormData with `image`, `customDate` (YYYY-MM-DD format), `rotation` | Processed image data (base64), angle measurements, and measurement ID |
| `/api/measurements/:id/metadata` | PATCH | Update metadata for a measurement | Yes | JSON with `memo`, `iconIds` | Updated measurement object |
| `/api/images/:hashKey` | GET | Get image by hash key | Yes | None | Redirects with message about direct image access |

### Data Endpoints

| Endpoint | Method | Description | Authentication Required | Query Parameters | Response |
|----------|--------|-------------|-------------------------|------------------|----------|
| `/api/angle-data` | GET | Get angle measurements | Yes | `start`, `end` (YYYY-MM-DD format) | Array of measurements with dates |
| `/api/latest-angle` | GET | Get the latest angle measurement | Yes | None | Latest measurement object |

## Client-Side Two-Step Upload Flow

The client-side image upload process uses a streamlined two-step approach that allows users to see results before adding metadata:

### Step 1: Image Upload and Processing

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

4. **Upload and Processing**:
   - FormData object is created with:
     - Processed image file
     - Custom date (ISO format with time set to noon to avoid timezone issues)
     - Rotation angle
   - JWT token is added to the Authorization header
   - Submitted to `/api/images/upload` endpoint
   - No memo or iconIds are sent at this stage
   - Upload and processing progress is indicated with loading animation

5. **Receiving Results**:
   - Server returns the processed image, angle measurements, and measurement ID
   - Client displays the processed image, date, and angles immediately
   - Client presents form for adding metadata below the results

### Step 2: Adding Metadata

1. **Metadata Input**:
   - User views the processing results
   - User can now make informed decisions about notes and icons
   - User adds optional notes and selects icons based on the results

2. **Metadata Submission**:
   - Client sends a PATCH request to `/api/measurements/:id/metadata`
   - Request includes the memo text and selected iconIds
   - JWT token is added to the Authorization header
   - UI shows loading state during submission

3. **Completion**:
   - Server confirms metadata update
   - Client displays success message
   - Data cache is invalidated to refresh chart data
   - Process is complete

4. **Error Handling**:
   - Client displays appropriate error messages for various failure cases
   - Handles network errors, validation failures, and server errors
   - Allows retry on failure for both steps

## Server-Side Image Processing

The server employs a memory-based image processing pipeline with a two-step workflow:

### Step 1: Image Upload and Processing

1. **Upload Handling**:
   - Uses busboy for multipart/form-data parsing (compatible with Netlify Functions)
   - Validates file type and size constraints
   - Generates a unique hash key for the image

2. **In-Memory Processing**:
   - All image processing is done in memory using buffers
   - No files are written to the local filesystem
   - Ideal for serverless environments like Netlify Functions

3. **Angle Detection**:
   - Processes image with OpenCV algorithms or Sharp fallback to detect angles
   - Calculates two dominant angles in the image
   - Applies user-specified rotation before processing

4. **Initial Data Storage**:
   - Stores image metadata in the database
   - Creates angle measurement records with angles and custom timestamp
   - Does not include memo or icon data at this stage

5. **Response Generation**:
   - Returns processed image data as base64-encoded string
   - Includes angle measurements and measurement ID in the response
   - Provides all necessary data for the client to display results

### Step 2: Metadata Addition

1. **Request Handling**:
   - Receives PATCH request to `/api/measurements/:id/metadata`
   - Extracts memo text and iconIds from request body
   - Validates user ownership of the measurement

2. **Metadata Update**:
   - Updates the existing measurement record with memo and iconIds
   - Maintains original measurement data (angles, timestamp, etc.)
   - Ensures data integrity with transaction handling

3. **Response**:
   - Returns the updated measurement object
   - Confirms successful metadata addition

This two-step approach provides several benefits:

1. **Improved User Experience**:
   - Users can make informed decisions about metadata after seeing results
   - Better context for adding meaningful notes and appropriate icons
   - Clear separation of processing and annotation steps

2. **Faster Initial Response**:
   - Image upload and processing happens without waiting for metadata input
   - Users see results quickly without needing to decide on metadata first

3. **Flexible Workflow**:
   - Metadata addition can happen immediately or later
   - Better organization of user interactions

## Netlify Serverless Functions

The application is designed to run both as a traditional Node.js server and as a serverless application on Netlify:

1. **Function Structure**:
   - Individual JavaScript functions in the `/netlify/functions` directory
   - Each function handles a specific API endpoint or related group of endpoints
   - Key functions include:
     - `images-upload.js`: Handles image upload and processing
     - `update-metadata.js`: Handles metadata updates for measurements
     - `angle-data.js`: Provides measurement data for charts
   - Configuration in `netlify.toml` maps API routes to functions

2. **Authentication in Functions**:
   - JWT authentication is implemented in functions using the same pattern as the server
   - Token verification and user extraction are consistent between environments

3. **Database Access**:
   - Functions connect to the same PostgreSQL database as the server
   - Uses the `@neondatabase/serverless` driver for optimized database connections

4. **Stateless Image Processing**:
   - All image processing is done in memory, with no filesystem dependencies
   - Image data is returned directly in the response as base64-encoded strings
   - Eliminates the need for temporary file storage

## Development and Deployment Notes

### Environment Variables

The application requires the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing

### Performance Optimizations

1. **Image Processing**:
   - In-memory processing with no filesystem I/O
   - Two-step workflow for better user experience
   - Base64 image data eliminates need for separate image retrieval

2. **Response Time**:
   - Client-side image and data caching
   - Single-request pattern eliminates polling and multiple API calls
   - Efficient database queries with proper indices

3. **Data Loading**:
   - Month-based data queries for efficient loading
   - Optimized rendering with React hooks
   - Chart data pre-processing for smooth visualization

### Stateless Architecture Benefits

1. **Simplified Deployment**:
   - No need to configure or maintain writable file storage
   - Works well with containerized and serverless environments
   - Lower infrastructure requirements

2. **Scalability**:
   - Each request is handled independently
   - No shared state between requests
   - Easy horizontal scaling

3. **Reliability**:
   - No dependencies on shared file systems
   - Fewer points of failure
   - More predictable error handling