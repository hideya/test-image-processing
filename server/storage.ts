import crypto from "crypto";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { users, images, angleMeasurements, User, InsertUser, Image, InsertImage, AngleMeasurement, InsertAngleMeasurement } from "@shared/schema";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Helper function to process image and save it
async function processImage(imageBuffer: Buffer, filePath: string): Promise<void> {
  try {
    // Process with sharp - force orientation to 1 to prevent auto rotation
    // The image is already rotated by the client, so we just preserve it
    let image = sharp(imageBuffer, {
      failOnError: false
    }).withMetadata({ orientation: 1 });

    // Save the image as-is (rotation already applied by client)
    await image.toFile(filePath);

    console.log(`Saved pre-rotated image to ${filePath}`);
  } catch (error) {
    console.error("Error processing image with sharp:", error);
    // Fallback to direct file write if sharp processing fails
    await fs.promises.writeFile(filePath, imageBuffer);
  }
}

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createImage(image: InsertImage): Promise<Image>;
  getImage(id: number): Promise<Image | undefined>;
  getImageByHashKey(hashKey: string): Promise<Image | undefined>;
  updateImageProcessedAngles(id: number, angle1: number, angle2: number): Promise<Image | undefined>;

  createAngleMeasurement(measurement: InsertAngleMeasurement): Promise<AngleMeasurement>;
  findMeasurementsByUserIdAndDate(userId: number, date: Date): Promise<AngleMeasurement[]>;
  deleteMeasurementById(id: number): Promise<void>;
  getAngleMeasurementsByUserIdAndDateRange(
    userId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<AngleMeasurement[]>;
  getLatestAngleMeasurementByDay(
    userId: number,
    days: number
  ): Promise<{date: string, angle: number, angle2: number, imageId: number, hashKey: string, memo?: string}[]>;

  sessionStore: session.Store;

  generateHashKey(): string;
  saveImageFile(imageBuffer: Buffer, filename: string): Promise<string>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private images: Map<number, Image>;
  private angleMeasurements: Map<number, AngleMeasurement>;
  private userIdCounter: number;
  private imageIdCounter: number;
  private angleMeasurementIdCounter: number;
  public sessionStore: session.Store;
  private uploadDir: string;

  constructor() {
    this.users = new Map();
    this.images = new Map();
    this.angleMeasurements = new Map();
    this.userIdCounter = 1;
    this.imageIdCounter = 1;
    this.angleMeasurementIdCounter = 1;
    // Use a memory store for the in-memory storage variant
    this.sessionStore = new session.MemoryStore();
    this.uploadDir = path.join(process.cwd(), 'uploads');

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.imageIdCounter++;
    const image: Image = { 
      ...insertImage, 
      id, 
      timestamp: new Date(), 
      processedAngle: null,
      processedAngle2: null,
      isProcessed: false,
      // thumbnailBase64 removed - no longer needed
    };
    this.images.set(id, image);
    return image;
  }

  async getImage(id: number): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async getImageByHashKey(hashKey: string): Promise<Image | undefined> {
    return Array.from(this.images.values()).find(
      (image) => image.hashKey === hashKey
    );
  }

  async updateImageProcessedAngles(id: number, angle1: number, angle2: number): Promise<Image | undefined> {
    const image = this.images.get(id);
    if (!image) return undefined;

    const updatedImage: Image = {
      ...image,
      processedAngle: angle1,
      processedAngle2: angle2,
      isProcessed: true
    };

    this.images.set(id, updatedImage);
    return updatedImage;
  }

  // Keep old method for backward compatibility
  async updateImageProcessedAngle(id: number, angle: number): Promise<Image | undefined> {
    return this.updateImageProcessedAngles(id, angle, angle + 5); // Default second angle slightly different
  }

  async createAngleMeasurement(insertMeasurement: InsertAngleMeasurement): Promise<AngleMeasurement> {
    const { customTimestamp, ...measurementData } = insertMeasurement;

    const measurement: AngleMeasurement = {
      ...measurementData,
      id: this.angleMeasurementIdCounter++,
      timestamp: customTimestamp || new Date(),
      memo: measurementData.memo || null,
      iconIds: measurementData.iconIds || null
    };
    this.angleMeasurements.set(measurement.id, measurement);
    return measurement;
  }

  async findMeasurementsByUserIdAndDate(userId: number, date: Date): Promise<AngleMeasurement[]> {
    // Create start and end dates for the given date (entire day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.angleMeasurements.values())
      .filter(measurement => 
        measurement.userId === userId &&
        measurement.timestamp >= startOfDay &&
        measurement.timestamp <= endOfDay
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async deleteMeasurementById(id: number): Promise<void> {
    this.angleMeasurements.delete(id);
  }

  async getAngleMeasurementsByUserIdAndDateRange(
    userId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<AngleMeasurement[]> {
    return Array.from(this.angleMeasurements.values())
      .filter(measurement => 
        measurement.userId === userId &&
        measurement.timestamp >= startDate &&
        measurement.timestamp <= endDate
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getLatestAngleMeasurementByDay(
    userId: number,
    days: number = 30
  ): Promise<{date: string, angle: number, angle2: number, imageId: number, hashKey: string, memo?: string, iconIds?: string}[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const measurements = await this.getAngleMeasurementsByUserIdAndDateRange(userId, startDate, endDate);

    // Group by day and keep latest
    const measurementsByDay = new Map<string, AngleMeasurement>();

    for (const measurement of measurements) {
      const dateStr = measurement.timestamp.toISOString().split('T')[0];
      const existingMeasurement = measurementsByDay.get(dateStr);

      if (!existingMeasurement || measurement.timestamp > existingMeasurement.timestamp) {
        measurementsByDay.set(dateStr, measurement);
      }
    }

    // Convert to array of {date, angle, angle2, imageId, hashKey, memo, iconIds} objects
    return Promise.all(
      Array.from(measurementsByDay.entries())
        .map(async ([date, measurement]) => {
          // Get the corresponding image information
          const image = await this.getImage(measurement.imageId);
          return {
            date,
            angle: measurement.angle,
            angle2: measurement.angle2,
            imageId: measurement.imageId,
            hashKey: image?.hashKey || '',
            memo: measurement.memo || undefined,
            iconIds: measurement.iconIds || undefined
          };
        })
    ).then(results => results.sort((a, b) => a.date.localeCompare(b.date)));
  }

  generateHashKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async saveImageFile(imageBuffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename);
    await processImage(imageBuffer, filePath);
    return filePath;
  }


}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  private uploadDir: string;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    });

    this.uploadDir = path.join(process.cwd(), 'uploads');

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const [image] = await db.insert(images).values(insertImage).returning();
    return image;
  }

  async getImage(id: number): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async getImageByHashKey(hashKey: string): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.hashKey, hashKey));
    return image;
  }

  async updateImageProcessedAngles(id: number, angle1: number, angle2: number): Promise<Image | undefined> {
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
  async updateImageProcessedAngle(id: number, angle: number): Promise<Image | undefined> {
    return this.updateImageProcessedAngles(id, angle, angle + 5); // Default second angle slightly different
  }

  async createAngleMeasurement(insertMeasurement: InsertAngleMeasurement): Promise<AngleMeasurement> {
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

  async findMeasurementsByUserIdAndDate(userId: number, date: Date): Promise<AngleMeasurement[]> {
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

  async deleteMeasurementById(id: number): Promise<void> {
    await db
      .delete(angleMeasurements)
      .where(eq(angleMeasurements.id, id));
  }

  async getAngleMeasurementsByUserIdAndDateRange(
    userId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<AngleMeasurement[]> {
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
  
  // New function to get angle measurements by date range in the same format as getLatestAngleMeasurementByDay
  async getAngleMeasurementsByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{date: string, angle: number, angle2: number, imageId: number, hashKey: string, memo?: string, iconIds?: string}[]> {
    // Using SQL directly to get properly formatted results with image information
    // and one measurement per day (latest for each day)
    const result = await db.execute<{date: string, angle: number, angle2: number, imageId: number, hashKey: string, memo: string | null, iconIds: string | null}>(sql`
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

    // Process results
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

  async getLatestAngleMeasurementByDay(
    userId: number,
    days: number = 30
  ): Promise<{date: string, angle: number, angle2: number, imageId: number, hashKey: string, memo?: string, iconIds?: string}[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Using SQL directly for this complex query with image information
    const result = await db.execute<{date: string, angle: number, angle2: number, imageId: number, hashKey: string, memo: string | null, iconIds: string | null}>(sql`
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

    // Process results
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

  generateHashKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async saveImageFile(imageBuffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename);
    await processImage(imageBuffer, filePath);
    return filePath;
  }


}

// Use the database storage
export const storage = new DatabaseStorage();