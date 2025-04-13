const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");
const session = require("express-session");
const connectPg = require("connect-pg-simple");
const { db, pool } = require("./db");
const { eq, and, desc, sql } = require("drizzle-orm");
const { users, images, angleMeasurements } = require("./schema");
const { r2Client } = require("./utils/r2-client");

// Helper function to process and apply manual rotation
async function processAndRotateImage(imageBuffer, key, manualRotation = 0) {
  try {
    // Process with sharp - force orientation to 1 to prevent auto rotation
    let image = sharp(imageBuffer, {
      failOnError: false
    }).withMetadata({ orientation: 1 });

    // Apply manual rotation if needed
    if (manualRotation !== 0) {
      console.log(`Applying manual rotation of ${manualRotation}° to image ${path.basename(key)}`);
      image = image.rotate(manualRotation);
    }

    // Process the image and get the buffer
    const processedBuffer = await image.toBuffer();
    
    // Upload to R2
    await r2Client.uploadFile(processedBuffer, key, 'image/jpeg');
    
    console.log(`Saved image to R2: ${key} with manual rotation: ${manualRotation}`);
    return key;
  } catch (error) {
    console.error("Error processing image with sharp:", error);
    // Fallback to direct upload if sharp processing fails
    await r2Client.uploadFile(imageBuffer, key, 'image/jpeg');
    return key;
  }
}

class DatabaseStorage {
  constructor() {
    console.log('*** Initializing DatabaseStorage');
    console.log('*** session module:', session);
    
    try {
      const PostgresSessionStore = connectPg(session);
      console.log('*** PostgresSessionStore created');
      
      this.sessionStore = new PostgresSessionStore({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
      });
      console.log('*** Session store initialized successfully');
    } catch (error) {
      console.log('*** Error initializing session store:', error.message);
    }

    // Define R2 storage folders
    this.imageFolder = 'images';
    this.mediumFolder = 'mediums';
  }

  async getUser(id) {
    console.log(`*** Getting user with ID: ${id}`);
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log(`*** User retrieval ${user ? 'successful' : 'failed - user not found'}`);
      return user;
    } catch (error) {
      console.log(`*** Error getting user by ID: ${error.message}`);
      throw error;
    }
  }

  async getUserByUsername(username) {
    console.log(`*** Getting user by username: ${username}`);
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      console.log(`*** User retrieval by username ${user ? 'successful' : 'failed - user not found'}`);
      return user;
    } catch (error) {
      console.log(`*** Error getting user by username: ${error.message}`);
      throw error;
    }
  }

  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createImage(insertImage) {
    const [image] = await db.insert(images).values(insertImage).returning();
    return image;
  }

  async getImage(id) {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async getImageByHashKey(hashKey) {
    const [image] = await db.select().from(images).where(eq(images.hashKey, hashKey));
    return image;
  }

  async updateImageProcessedAngles(id, angle1, angle2) {
    const [updatedImage] = await db
      .update(images)
      .set({ 
        processedAngle: angle1,
        processedAngle2: angle2,
        isProcessed: true
      })
      .where(eq(images.id, id))
      .returning();

    return updatedImage;
  }

  // Keep old method for backward compatibility
  async updateImageProcessedAngle(id, angle) {
    return this.updateImageProcessedAngles(id, angle, angle + 5); // Default second angle slightly different
  }

  async createAngleMeasurement(insertMeasurement) {
    const { customTimestamp, ...measurementData } = insertMeasurement;

    const dataToInsert = {
      ...measurementData,
      timestamp: customTimestamp || new Date(),
      memo: measurementData.memo || null,
      iconIds: Array.isArray(measurementData.iconIds) 
        ? measurementData.iconIds.join(',') 
        : measurementData.iconIds || null
    };

    console.log("Creating angle measurement with data:", {
      ...dataToInsert,
      timestamp: dataToInsert.timestamp ? dataToInsert.timestamp.toISOString() : null
    });

    const [measurement] = await db
      .insert(angleMeasurements)
      .values(dataToInsert)
      .returning();

    return measurement;
  }

  async findMeasurementsByUserIdAndDate(userId, date) {
    // Create start and end dates for the given date (entire day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(angleMeasurements)
      .where(
        and(
          eq(angleMeasurements.userId, userId),
          sql`${angleMeasurements.timestamp} >= ${startOfDay}`,
          sql`${angleMeasurements.timestamp} <= ${endOfDay}`
        )
      )
      .orderBy(angleMeasurements.timestamp);
  }

  async deleteMeasurementById(id) {
    await db
      .delete(angleMeasurements)
      .where(eq(angleMeasurements.id, id));
  }

  async getAngleMeasurementsByUserIdAndDateRange(userId, startDate, endDate) {
    return await db
      .select()
      .from(angleMeasurements)
      .where(
        and(
          eq(angleMeasurements.userId, userId),
          sql`${angleMeasurements.timestamp} >= ${startDate}`,
          sql`${angleMeasurements.timestamp} <= ${endDate}`
        )
      )
      .orderBy(angleMeasurements.timestamp);
  }

  async getLatestAngleMeasurementByDay(userId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Using SQL directly for this complex query with image information including thumbnails
    const result = await db.execute(sql`
      WITH daily_measurements AS (
        SELECT 
          TO_CHAR(am.timestamp, 'YYYY-MM-DD') as date,
          am.angle,
          am.angle2,
          am.image_id as "imageId",
          img.hash_key as "hashKey",
          am.memo,
          am.icon_ids as "iconIds",
          ROW_NUMBER() OVER (
            PARTITION BY TO_CHAR(am.timestamp, 'YYYY-MM-DD') 
            ORDER BY am.id DESC
          ) as rn
        FROM angle_measurements am
        JOIN images img ON am.image_id = img.id
        WHERE 
          am.user_id = ${userId} AND
          am.timestamp >= ${startDate} AND
          am.timestamp <= ${endDate}
      )
      SELECT date, angle, angle2, "imageId", "hashKey", memo, "iconIds"
      FROM daily_measurements
      WHERE rn = 1
      ORDER BY date
    `);

    // Process results to handle null thumbnails properly
    return result.rows.map(row => ({
      date: row.date,
      angle: row.angle,
      angle2: row.angle2,
      imageId: row.imageId,
      hashKey: row.hashKey,
      memo: row.memo || undefined,
      iconIds: row.iconIds || undefined
    }));
  }

  generateHashKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  async saveImageFile(imageBuffer, filename, rotation = 0) {
    // Create the R2 key for the image
    const key = `${this.imageFolder}/${filename}`;
    
    // Process, rotate if needed, and upload to R2
    await processAndRotateImage(imageBuffer, key, rotation);
    
    // Store the R2 key as the imagePath in database
    return key;
  }

  async generateMediumImage(imagePath) {
    try {
      // Get the filename from the path
      const filename = path.basename(imagePath);
      
      // Create a key for the medium image
      const mediumKey = `${this.mediumFolder}/${filename}`;
      
      // Get the original image from R2
      const imageBuffer = await r2Client.getFile(imagePath);
      
      // Create an 800px width/height medium image with 85% JPEG quality
      // Force orientation to 1 (normal) to prevent automatic rotation based on EXIF data
      const image = sharp(imageBuffer, {
        // Disable automatic rotation based on EXIF
        failOnError: false
      }).withMetadata({ orientation: 1 });

      // Resize to fit within 800x800 while maintaining aspect ratio
      const resizedImage = image.resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true
      });

      // Convert to JPEG with 85% quality and get buffer
      const mediumBuffer = await resizedImage
        .toFormat('jpeg', { quality: 85 })
        .toBuffer();
      
      // Upload to R2
      await r2Client.uploadFile(mediumBuffer, mediumKey, 'image/jpeg');

      console.log(`Generated medium image at R2: ${mediumKey} from ${imagePath}`);
      return mediumKey;
    } catch (error) {
      console.error('Error generating medium image:', error);
      return imagePath; // Return original path as fallback
    }
  }

  async getMediumImagePath(hashKey) {
    try {
      const image = await this.getImageByHashKey(hashKey);
      if (!image || !image.imagePath) {
        return null;
      }

      const filename = path.basename(image.imagePath);
      const mediumKey = `${this.mediumFolder}/${filename}`;
      
      try {
        // Try to get the medium image
        await r2Client.getFile(mediumKey);
        return mediumKey;
      } catch (error) {
        // Medium doesn't exist, create it
        return await this.generateMediumImage(image.imagePath);
      }
    } catch (error) {
      console.error('Error getting medium image path:', error);
      return null;
    }
  }
  
  // New method to get file buffer from R2
  async getImageBuffer(imagePath) {
    try {
      return await r2Client.getFile(imagePath);
    } catch (error) {
      console.error('Error getting image buffer:', error);
      throw error;
    }
  }
}

// Use the database storage
const storage = new DatabaseStorage();

module.exports = { storage };
