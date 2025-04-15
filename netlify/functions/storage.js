const crypto = require("crypto");
const sharp = require("sharp");
const session = require("express-session");
const connectPg = require("connect-pg-simple");
const { db, pool } = require("./db");
const { eq, and, desc, sql } = require("drizzle-orm");
const { users, images, angleMeasurements } = require("./schema");

// Helper function to process image and save it
async function processImageBuffer(imageBuffer) {
  try {
    // Process with sharp
    let processedBuffer = await sharp(imageBuffer, {
      failOnError: false
    })
    .withMetadata({ orientation: 1 })
    .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error("Error processing image with sharp:", error);
    // Fallback to original buffer
    return imageBuffer;
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

  async createImageWithoutFile(imageData) {
    // For Netlify functions, we don't save physical files
    console.log('Creating image record without file path');
    const [image] = await db.insert(images).values(imageData).returning();
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

  async getMeasurementById(id) {
    const [measurement] = await db
      .select()
      .from(angleMeasurements)
      .where(eq(angleMeasurements.id, id));
    return measurement;
  }

  async updateMeasurementMetadata(measurementId, metadata) {
    // Prepare update data - only include fields that are provided
    const updateData = {};
    
    if (metadata.memo !== undefined) {
      updateData.memo = metadata.memo;
    }
    
    if (metadata.iconIds !== undefined) {
      updateData.iconIds = metadata.iconIds;
    }
    
    // Only proceed if there's something to update
    if (Object.keys(updateData).length === 0) {
      // Nothing to update, just return the current measurement
      return this.getMeasurementById(measurementId);
    }
    
    // Update the record
    const [updatedMeasurement] = await db
      .update(angleMeasurements)
      .set(updateData)
      .where(eq(angleMeasurements.id, measurementId))
      .returning();
      
    return updatedMeasurement;
  }

  // Method removed in favor of getAngleMeasurementsByDateRange
  // which provides a consistent API response format
  
  // New function to get angle measurements by date range in the same format as getLatestAngleMeasurementByDay
  async getAngleMeasurementsByDateRange(userId, startDate, endDate) {
    // Using SQL directly to get properly formatted results with image information
    // and one measurement per day (latest for each day)
    const result = await db.execute(sql`
      WITH daily_measurements AS (
        SELECT 
          am.id,
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
      SELECT id, date, angle, angle2, "imageId", "hashKey", memo, "iconIds"
      FROM daily_measurements
      WHERE rn = 1
      ORDER BY date
    `);

    // Process results
    return result.rows.map(row => ({
      id: row.id,
      date: row.date,
      angle: row.angle,
      angle2: row.angle2,
      imageId: row.imageId,
      hashKey: row.hashKey,
      memo: row.memo || undefined,
      iconIds: row.iconIds || undefined
    }));
  }

  async getLatestAngleMeasurementByDay(userId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Using SQL directly for this complex query with image information
    const result = await db.execute(sql`
      WITH daily_measurements AS (
        SELECT 
          am.id,
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
      SELECT id, date, angle, angle2, "imageId", "hashKey", memo, "iconIds"
      FROM daily_measurements
      WHERE rn = 1
      ORDER BY date
    `);

    // Process results
    return result.rows.map(row => ({
      id: row.id,
      date: row.date,
      angle: row.angle,
      angle2: row.angle2,
      imageId: row.imageId,
      hashKey: row.hashKey,
      memo: row.memo || undefined,
      iconIds: row.iconIds || undefined
    }));
  }

  // Helper function to generate a unique hash key for images
  generateHashKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  async generateMediumImageBuffer(imageBuffer, maxSize = 800) {
    try {
      console.log(`Generating medium image (max size: ${maxSize}px)`);
      
      const resizedBuffer = await sharp(imageBuffer, {
        failOnError: false
      })
      .withMetadata({ orientation: 1 }) // Preserve orientation
      .resize({
        width: maxSize,
        height: maxSize,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();
      
      console.log("Successfully generated medium-sized image buffer");
      return resizedBuffer;
    } catch (error) {
      console.error("Error generating medium image:", error);
      // Return original if resize fails
      return imageBuffer;
    }
  }
}

// Use the database storage
const storage = new DatabaseStorage();

module.exports = { storage };
