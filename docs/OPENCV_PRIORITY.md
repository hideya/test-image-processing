# OpenCV Priority Notice

## IMPORTANT: OpenCV is the primary and required image processing library for this project

This project requires OpenCV for its image processing capabilities. While there might be temporary workarounds or fallbacks to libraries like Sharp, the long-term goal and priority is to make OpenCV work correctly.

## Why OpenCV is Essential

1. **Advanced Image Processing**: Future implementations will require complex computer vision algorithms that only OpenCV provides
2. **Performance**: OpenCV is optimized for image processing operations 
3. **Feature Set**: OpenCV offers a comprehensive set of image processing and computer vision algorithms

## Current Status

- OpenCV-WASM is currently installed but experiencing API compatibility issues
- Temporary fallbacks to Sharp are in place to keep the application functional
- All image processing now uses buffer-based operations instead of file-based
- The immediate priority is to resolve OpenCV integration issues

## Next Steps

1. Investigate OpenCV-WASM API documentation and examples to resolve function compatibility issues
2. Consider alternative versions of OpenCV-WASM that might provide better compatibility
3. Explore the pre-built OpenCV binaries approach for AWS Lambda/Netlify as described in NETLIFY_PRODUCTION_NOTES.md

## Development Guidelines

- Any code added to this project should prioritize OpenCV compatibility
- All image processing should use buffer-based methods, not file-based
- Fallbacks to other libraries should be clearly marked as temporary
- When implementing new image processing features, always try to use OpenCV first

This priority notice serves as a reminder that all alternatives to OpenCV are temporary solutions while we resolve the OpenCV integration issues.
