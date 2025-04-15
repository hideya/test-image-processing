import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Import JWT auth instead of session auth
import { isAuthenticated } from "./auth-jwt";
import { processImageBuffer } from "./opencv";
import busboy from "busboy";
import path from "path";
import fs from "fs";
import {
  insertAngleMeasurementSchema,
  InsertAngleMeasurement,
  images,
} from "@shared/schema";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { angleMeasurements } from "@shared/schema";
import { createImageWithoutPath } from "./createImageWithoutPath";

/**
 * Handle multipart form data using busboy
 * 
 * Busboy vs Multer:
 * - Busboy provides lower-level control over the parsing process
 * - Busboy processes data as streams, which is more memory efficient
 * - Busboy has fewer dependencies, making it lighter weight
 * - Busboy works better in serverless environments (consistent with our Netlify implementation)
 * - Multer would be simpler for standard Express apps, but busboy gives us more flexibility
 *
 * @param {Request} req - Express request object
 * @returns {Promise<Object>} Parsed form data with file and fields
 */
function handleFileUpload(req: Request): Promise<{
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
  fields: Record<string, string>;
}> {
  return new Promise((resolve, reject) => {
    // Check if content-type header exists and includes multipart/form-data
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return reject(new Error('Expected multipart/form-data'));
    }

    // Normalize headers to lowercase
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value || '';
    }

    // Initialize busboy instance with configuration
    const bb = busboy({ 
      headers,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      }
    });
    
    // Result object to store parsed data
    const result: {
      file?: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
      };
      fields: Record<string, string>;
    } = {
      fields: {}
    };

    // Handle file field - busboy processes files as streams for efficiency
    bb.on('file', (fieldname, fileStream, fileInfo) => {
      const { filename, encoding, mimeType } = fileInfo;
      
      // Only accept certain file types
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedMimeTypes.includes(mimeType)) {
        fileStream.resume(); // Skip this file
        return reject(new Error("File type not supported. Please upload a JPEG or PNG image."));
      }
      
      // Collect file data in chunks (stream processing)
      const chunks: Buffer[] = [];
      
      fileStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      fileStream.on('end', () => {
        if (chunks.length > 0) {
          result.file = {
            buffer: Buffer.concat(chunks),
            originalname: filename,
            mimetype: mimeType
          };
        }
      });
    });
    
    // Handle regular fields
    bb.on('field', (fieldname, value) => {
      result.fields[fieldname] = value;
    });
    
    // Handle completion of parsing
    bb.on('finish', () => {
      resolve(result);
    });
    
    // Handle errors during parsing
    bb.on('error', (error) => {
      reject(error);
    });
    
    // Pipe request to busboy - this is how busboy gets the data
    req.pipe(bb);
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes are now set up in index.ts with setupJWTAuth

  // API endpoints

  // Upload and process image
  app.post(
    "/api/images/upload",
    isAuthenticated,
    async (req, res) => {
      try {
        // Parse multipart form data using busboy instead of multer
        // This gives us consistency with our Netlify Functions implementation
        const formData = await handleFileUpload(req);
        
        if (!formData.file) {
          return res.status(400).json({ message: "No image file provided" });
        }

        const userId = req.user.id;
        const hashKey = storage.generateHashKey();
        const fileExt = path.extname(formData.file.originalname);
        const filename = `${hashKey}${fileExt}`;

        // A timestamp is now mandatory for all uploads
        if (!formData.fields.customDate) {
          return res.status(400).json({
            message:
              "Measurement date is required. Please provide a customDate field.",
          });
        }

        let customDate: Date;
        try {
          // Parse the provided date string
          customDate = new Date(formData.fields.customDate);

          // Validate the date - it shouldn't be in the future
          const currentDate = new Date();
          if (customDate > currentDate) {
            return res.status(400).json({
              message: "Measurement date cannot be in the future",
            });
          }
        } catch (err) {
          return res.status(400).json({
            message: "Invalid date format. Please use ISO date format.",
          });
        }

        // Log client rotation value if provided (for debugging only)
        if (formData.fields.clientRotation) {
          console.log(`Client applied rotation of ${formData.fields.clientRotation} degrees before upload`);
        }
        
        // Process the image directly in memory
        const processingResult = await processImageBuffer(formData.file.buffer);
        
        // Create a single image record with angle data
        const image = await createImageWithoutPath(
          userId,
          hashKey,
          {
            angle: processingResult.angle,
            angle2: processingResult.angle2
          }
        );

        // Create angle measurement record with mandatory client-provided timestamp
        // In the updated workflow, memo and iconIds are not required at upload time
        // They will be added in the second step via the metadata update endpoint
        const measurementData: InsertAngleMeasurement & {
          customTimestamp: Date;
        } = {
          imageId: image.id,
          userId,
          angle: processingResult.angle,
          angle2: processingResult.angle2,
          customTimestamp: customDate, // Always use client-provided date
          // Note: memo and iconIds are now optional and can be updated later
        };

        // Check if there are existing measurements for this date
        const existingMeasurements =
          await storage.findMeasurementsByUserIdAndDate(
            userId,
            customDate,
          );

        // If there are existing measurements, delete them (we're replacing them)
        if (existingMeasurements.length > 0) {
          console.log(
            `Found ${existingMeasurements.length} existing measurements for date ${customDate.toISOString()}, deleting them before adding new one`,
          );
          for (const measurement of existingMeasurements) {
            await storage.deleteMeasurementById(measurement.id);
          }
        }

        const measurement = await storage.createAngleMeasurement(measurementData);

        // Return complete response with processed image and angles
        res.status(200).json({
          success: true,
          measurement: {
            id: measurement.id,
            angle: processingResult.angle,
            angle2: processingResult.angle2,
            date: customDate
          },
          image: {
            id: image.id,
            hashKey: image.hashKey
          },
          processedImage: {
            base64: processingResult.processedImageBuffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Failed to upload image" });
      }
    },
  );

  // Get angle data for chart
  app.get("/api/angle-data", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Check if start and end dates are provided
      if (req.query.start && req.query.end) {
        const startDate = new Date(req.query.start as string);
        const endDate = new Date(req.query.end as string);
        
        console.log(`Fetching measurements for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`Raw date strings from request: start=${req.query.start}, end=${req.query.end}`);
        
        // Get angle measurements for the specified date range with consistent format
        const measurements = await storage.getAngleMeasurementsByDateRange(
          userId,
          startDate,
          endDate
        );
        
        console.log(`Returning ${measurements.length} measurements with YYYY-MM-DD date format`);
        if (measurements.length > 0) {
          console.log('First measurement:', JSON.stringify(measurements[0]));
        } else {
          console.log('No measurements found for this date range');
        }
        res.json(measurements);
      } else {
        // Fallback to days parameter if no date range provided
        const days = parseInt(req.query.days as string) || 30;
        console.log(`Fetching measurements for last ${days} days`);
        
        // Get angle measurements for the specified number of days
        const measurements = await storage.getLatestAngleMeasurementByDay(
          userId,
          days,
        );
        
        res.json(measurements);
      }
    } catch (error) {
      console.error("Error fetching angle data:", error);
      res.status(500).json({ message: "Failed to fetch angle data" });
    }
  });

  // Get image by hash key
  app.get("/api/images/:hashKey", isAuthenticated, async (req, res) => {
    try {
      const { hashKey } = req.params;

      const image = await storage.getImageByHashKey(hashKey);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Check if the user is authorized to access this image
      if (image.userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized access to image" });
      }

      // For serverless functions, respond with a message that direct image access is no longer supported
      // Instead, clients should use the base64 data returned from the upload endpoint
      return res.status(307).json({ 
        message: "Image data is now returned directly in the upload response. Please update your client to the newest version.", 
        redirectUrl: "/app/settings?update=true"
      });
    } catch (error) {
      console.error("Error retrieving image:", error);
      res.status(500).json({ message: "Failed to retrieve image" });
    }
  });

  // Get original image by hash key (explicit route for original images)
  app.get(
    "/api/images/:hashKey/original",
    isAuthenticated,
    async (req, res) => {
      try {
        const { hashKey } = req.params;

        const image = await storage.getImageByHashKey(hashKey);
        if (!image) {
          return res.status(404).json({ message: "Image not found" });
        }

        // Check if the user is authorized to access this image
        if (image.userId !== req.user.id) {
          return res
            .status(403)
            .json({ message: "Unauthorized access to image" });
        }

        // For serverless functions, respond with a message that direct image access is no longer supported
        // Instead, clients should use the base64 data returned from the upload endpoint
        return res.status(307).json({ 
          message: "Image data is now returned directly in the upload response. Please update your client to the newest version.", 
          redirectUrl: "/app/settings?update=true"
        });
      } catch (error) {
        console.error("Error retrieving original image:", error);
        res.status(500).json({ message: "Failed to retrieve original image" });
      }
    },
  );

  // Get processed image by hash key
  app.get("/api/images/:hashKey/processed", isAuthenticated, async (req, res) => {
    try {
      const { hashKey } = req.params;

      const image = await storage.getImageByHashKey(hashKey);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Check if the user is authorized to access this image
      if (image.userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized access to image" });
      }

      // For serverless functions, respond with a message that direct image access is no longer supported
      // Instead, clients should use the base64 data returned from the upload endpoint
      return res.status(307).json({ 
        message: "Image data is now returned directly in the upload response. Please update your client to the newest version.", 
        redirectUrl: "/app/settings?update=true"
      });
    } catch (error) {
      console.error("Error retrieving processed image:", error);
      res.status(500).json({ message: "Failed to retrieve processed image" });
    }
  });

  // Thumbnail endpoint removed - no longer needed

  // Endpoint to add/update metadata for an existing measurement
  app.patch("/api/measurements/:id/metadata", isAuthenticated, async (req, res) => {
    try {
      const measurementId = parseInt(req.params.id);
      const { memo, iconIds } = req.body;
      
      if (isNaN(measurementId)) {
        return res.status(400).json({ message: "Invalid measurement ID" });
      }
      
      // Get the existing measurement to verify ownership
      const existingMeasurement = await storage.getMeasurementById(measurementId);
      
      if (!existingMeasurement) {
        return res.status(404).json({ message: "Measurement not found" });
      }
      
      // Verify the user owns this measurement
      if (existingMeasurement.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update the measurement with new metadata
      const updatedMeasurement = await storage.updateMeasurementMetadata(
        measurementId, 
        { memo, iconIds }
      );
      
      res.status(200).json({
        success: true,
        measurement: updatedMeasurement
      });
    } catch (error) {
      console.error("Error updating measurement metadata:", error);
      res.status(500).json({ message: "Failed to update measurement metadata" });
    }
  });

  // Endpoint to delete a measurement
  app.delete("/api/measurements/:id", isAuthenticated, async (req, res) => {
    try {
      const measurementId = parseInt(req.params.id);
      
      if (isNaN(measurementId)) {
        return res.status(400).json({ message: "Invalid measurement ID" });
      }
      
      // Get the existing measurement to verify ownership
      const existingMeasurement = await storage.getMeasurementById(measurementId);
      
      if (!existingMeasurement) {
        return res.status(404).json({ message: "Measurement not found" });
      }
      
      // Verify the user owns this measurement
      if (existingMeasurement.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Delete the measurement
      await storage.deleteMeasurementById(measurementId);
      
      res.status(200).json({
        success: true,
        message: "Measurement deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting measurement:", error);
      res.status(500).json({ message: "Failed to delete measurement" });
    }
  });

  // Get the latest calculated angle
  app.get("/api/latest-angle", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      // Fetch the last measurement based on the ID (last inserted)
      const [lastMeasurement] = await db
        .select()
        .from(angleMeasurements)
        .where(eq(angleMeasurements.userId, userId))
        .orderBy(desc(angleMeasurements.id)) // Order by ID to retrieve the last inserted measurement
        .limit(1);
      if (!lastMeasurement) {
        return res.json({ angle: null, angle2: null });
      }
      res.json({
        angle: lastMeasurement.angle,
        angle2: lastMeasurement.angle2,
      });
    } catch (error) {
      console.error("Error fetching last angle:", error);
      res.status(500).json({ message: "Error fetching last angle" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
