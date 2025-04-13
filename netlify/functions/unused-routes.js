const { createServer } = require("http");
const { storage } = require("./storage");
const { setupAuth } = require("./auth");
const { processImage, preprocessImage } = require("./opencv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { eq, desc } = require("drizzle-orm");
const { db } = require("./db");
const { angleMeasurements } = require("./schema");

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

async function registerRoutes(app) {
  // Setup authentication routes
  setupAuth(app);

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

        let customDate;
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

        // Get rotation value from request if provided
        let rotation = 0;
        if (req.body.rotation) {
          try {
            rotation = parseInt(req.body.rotation, 10);
            // Normalize to 0, 90, 180, or 270 degrees
            rotation = ((rotation % 360) + 360) % 360;
            console.log(
              `Applying rotation of ${rotation} degrees to uploaded image`,
            );
          } catch (err) {
            console.error("Invalid rotation value, defaulting to 0", err);
          }
        }

        // Save the original image, applying rotation if specified
        const imagePath = await storage.saveImageFile(
          req.file.buffer,
          filename,
          rotation,
        );

        // Save image record to storage with thumbnail
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
              const measurementData = {
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

        // Return immediate response with image info including thumbnail
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
      const days = parseInt(req.query.days) || 30;

      // Get angle measurements for the specified date range
      const measurements = await storage.getLatestAngleMeasurementByDay(
        userId,
        days,
      );

      res.json(measurements);
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

  // Get medium-sized image by hash key
  app.get("/api/images/:hashKey/medium", isAuthenticated, async (req, res) => {
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

      // Generate or get the medium-sized image
      const mediumImagePath = await storage.getMediumImagePath(hashKey);
      if (!mediumImagePath || !fs.existsSync(mediumImagePath)) {
        return res
          .status(404)
          .json({ message: "Medium image could not be generated" });
      }

      // Set cache control headers - medium images can be cached for longer periods
      // since they're less likely to change than the dynamic components
      res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hour cache

      // Log that we're sending the medium image file
      console.log(`Sending medium image file: ${mediumImagePath}`);

      // Send the medium image file
      res.sendFile(path.resolve(mediumImagePath));
    } catch (error) {
      console.error("Error retrieving medium image:", error);
      res.status(500).json({ message: "Failed to retrieve medium image" });
    }
  });

  // Get thumbnail by hash key
  app.get("/api/thumbnails/:hashKey", isAuthenticated, async (req, res) => {
    try {
      const { hashKey } = req.params;

      const image = await storage.getImageByHashKey(hashKey);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Check if the user is authorized to access this thumbnail
      if (image.userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized access to thumbnail" });
      }

      return res
        .status(404)
        .json({ message: "Image file not found for thumbnail generation" });
    } catch (error) {
      console.error("Error retrieving thumbnail:", error);
      res.status(500).json({ message: "Failed to retrieve thumbnail" });
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

module.exports = { registerRoutes };
