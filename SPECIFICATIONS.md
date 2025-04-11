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
  processed_angle INTEGER,
  is_processed BOOLEAN DEFAULT FALSE,
  thumbnail_base64 TEXT
);
```

### Angle Measurements Table
```sql
CREATE TABLE angle_measurements (
  id SERIAL PRIMARY KEY,
  image_id INTEGER NOT NULL REFERENCES images(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  angle INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Session Table
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
3. **Session Management**: Express-session with PostgreSQL session store for persistent sessions
4. **Login Process**: Passport.js local strategy authenticates users against database
5. **Session Serialization**: User ID is stored in session after successful authentication

### Security Mechanisms

1. **Password Security**:
   - Passwords are hashed using scrypt with a unique salt for each user
   - Timing-safe comparison used to prevent timing attacks
   - Original passwords are never stored or transmitted

2. **Session Security**:
   - Server-side session storage with secure cookies
   - Session expiration to limit session duration
   - Session invalidation on logout
   - Protection against session fixation

3. **API Security**:
   - Authentication middleware (`isAuthenticated`) protects all sensitive routes
   - User-specific access control for private resources
   - CSRF protection through proper cookie configuration
   - HTTP-only session cookies
   - API routes verify user authorization before providing access to resources

### Authentication Middleware

```javascript
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};
```

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Authentication Required | Request Body | Response |
|----------|--------|-------------|-------------------------|--------------|----------|
| `/api/register` | POST | Register a new user | No | `{ username, email, password }` | User object (without password) |
| `/api/login` | POST | Login a user | No | `{ username, password }` | User object (without password) |
| `/api/logout` | POST | Logout a user | Yes | None | Status 200 |
| `/api/user` | GET | Get current user | Yes | None | User object (without password) |

### Image Management Endpoints

| Endpoint | Method | Description | Authentication Required | Request Body | Response |
|----------|--------|-------------|-------------------------|--------------|----------|
| `/api/images/upload` | POST | Upload an image | Yes | FormData with `image`, `customDate`, `rotation` | Image metadata with processing status |
| `/api/images/:hashKey` | GET | Get image by hash key | Yes | None | Image file |
| `/api/images/:hashKey/original` | GET | Get original image | Yes | None | Original image file |
| `/api/images/:hashKey/medium` | GET | Get medium sized image | Yes | None | Medium sized image file |
| `/api/images/:hashKey/thumbnail` | GET | Get thumbnail | Yes | None | Thumbnail image |

### Data Endpoints

| Endpoint | Method | Description | Authentication Required | Query Parameters | Response |
|----------|--------|-------------|-------------------------|------------------|----------|
| `/api/angle-data` | GET | Get angle measurements | Yes | `days` (optional, default: 30) | Array of measurements with dates |
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
   - Original images stored in `uploads/originals` directory
   - Creates directory structure if not present
   - Uses hash-based filenames to prevent collisions

3. **Thumbnail Generation**:
   - Creates 64x64 pixel thumbnails with Sharp
   - Stores thumbnails as base64 strings in the database for fast retrieval
   - Maintains aspect ratio with object-fit: cover approach

4. **Medium Image Generation**:
   - Creates 800x800 pixel medium-sized images (preserving aspect ratio)
   - Stores in `uploads/mediums` directory
   - Used for expanded image views
   - Applies 85% JPEG quality for size optimization

5. **Angle Detection**:
   - Processes image with OpenCV algorithms to detect lines and angles
   - Implements edge detection and Hough transform
   - Calculates dominant angles in the image
   - Applies user-specified rotation before processing

6. **Data Storage**:
   - Stores image metadata in the database
   - Creates angle measurement records linked to images and users
   - Supports custom timestamp assignment for historical data

7. **Cache Headers**:
   - Sets appropriate cache control headers for different image types
   - Prevents browser caching issues with appropriate headers
   - Implements etag support for efficient network usage

## Development and Deployment Notes

### Environment Variables

The application requires the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `PORT`: (Optional) Port to run the server on (defaults to 5000)

### File Storage Considerations

- Ensure the `uploads` directory and its subdirectories exist and are writable
- Required subdirectories:
  - `uploads/originals`: Original uploaded images
  - `uploads/processed`: Processed images with annotations
  - `uploads/thumbnails`: Thumbnail images (if not using base64)
  - `uploads/mediums`: Medium-sized images for display

### Performance Optimizations

1. **Image Processing**:
   - Server-side image resize before OpenCV processing
   - Web worker threading for non-blocking processing
   - Asynchronous processing with immediate response

2. **Response Time**:
   - Base64 thumbnail storage for reduced HTTP requests
   - Client-side image and data caching
   - Medium image preloading for expanded views

3. **Data Loading**:
   - Pagination of measurement history
   - Lazy loading of historical data
   - Optimized database queries with proper indices
