import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Import JWT auth instead of session auth
import { isAuthenticated } from "./auth-jwt";
import { processImage, preprocessImage } from "./opencv";
import multer from "multer";
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

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    // Only accept image files
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "File type not supported. Please upload a JPEG or PNG image.",
        ),
      );
    }
  },
});

// Authentication middleware is now imported from auth-jwt.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes are now set up in index.ts with setupJWTAuth

  // API endpoints

  // Upload and process image
  app.post(
    "/api/images/upload",
    isAuthenticated,
    upload.single("image"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No image file provided" });
        }

        const userId = req.user.id;
        const hashKey = storage.generateHashKey();
        const fileExt = path.extname(req.file.originalname);
        const filename = `${hashKey}${fileExt}`;

        // A timestamp is now mandatory for all uploads
        if (!req.body.customDate) {
          return res.status(400).json({
            message:
              "Measurement date is required. Please provide a customDate field.",
          });
        }

        let customDate: Date;
        try {
          // Parse the provided date string
          customDate = new Date(req.body.customDate);

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
        if (req.body.clientRotation) {
          console.log(`Client applied rotation of ${req.body.clientRotation} degrees before upload`);
        }
        
        // Save the original image (rotation is already applied on the client side)
        console.log("Saving pre-rotated image uploaded from client");
        const imagePath = await storage.saveImageFile(
          req.file.buffer,
          filename
        );

        // Save image record to storage
        const image = await storage.createImage({
          userId,
          imagePath,
          hashKey,
        });

        // Preprocess the image (async)
        preprocessImage(imagePath)
          .then((processedImagePath) => {
            // Process the image to calculate angles
            return processImage(processedImagePath).then(async (angles) => {
              // Update the image with processed angles
              await storage.updateImageProcessedAngles(
                image.id,
                angles.angle,
                angles.angle2,
              );

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

              // Create angle measurement record with mandatory client-provided timestamp
              const measurementData: InsertAngleMeasurement & {
                customTimestamp: Date;
              } = {
                imageId: image.id,
                userId,
                angle: angles.angle,
                angle2: angles.angle2,
                customTimestamp: customDate, // Always use client-provided date
                memo: req.body.memo || undefined, // Add memo if provided
                iconIds: req.body.iconIds || undefined, // Add icon IDs if provided
              };

              await storage.createAngleMeasurement(measurementData);
            });
          })
          .catch((err) => {
            console.error("Error processing image:", err);
          });

        // Return immediate response with image info
        res.status(201).json({
          id: image.id,
          hashKey: image.hashKey,
          message: "Image uploaded successfully and scheduled for processing",
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
        
        // Get angle measurements for the specified date range
        const measurements = await storage.getAngleMeasurementsByDateRange(
          userId,
          startDate,
          endDate
        );
        
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

      // Verify the file exists
      if (!fs.existsSync(image.imagePath)) {
        return res.status(404).json({ message: "Image file not found" });
      }

      // Set cache control headers to prevent caching issues
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Log that we're sending the image file
      console.log(`Sending image file: ${image.imagePath}`);

      // Send the image file
      res.sendFile(path.resolve(image.imagePath));
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

        // Verify the file exists
        if (!fs.existsSync(image.imagePath)) {
          return res.status(404).json({ message: "Image file not found" });
        }

        // Set cache control headers to prevent caching issues
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Log that we're sending the image file
        console.log(`Sending image file: ${image.imagePath}`);

        // Send the original image file
        res.sendFile(path.resolve(image.imagePath));
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

      // Get the processed image path
      const filename = path.basename(image.imagePath);
      const outputDir = path.dirname(image.imagePath);
      const processedFileName = `processed_${filename}`;
      const processedImagePath = path.join(outputDir, processedFileName);

      // Verify the file exists
      if (!fs.existsSync(processedImagePath)) {
        return res
          .status(404)
          .json({ message: "Processed image not found" });
      }

      // Set cache control headers
      res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hour cache

      // Log that we're sending the processed image file
      console.log(`Sending processed image file: ${processedImagePath}`);

      // Send the processed image file
      res.sendFile(path.resolve(processedImagePath));
    } catch (error) {
      console.error("Error retrieving processed image:", error);
      res.status(500).json({ message: "Failed to retrieve processed image" });
    }
  });

  // Thumbnail endpoint removed - no longer needed

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
