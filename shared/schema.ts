import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

// Image schema
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  hashKey: text("hash_key").notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  processedAngle: real("processed_angle"),
  processedAngle2: real("processed_angle2"), // Second angle measurement
  isProcessed: boolean("is_processed").default(false),
});

// Angle measurement schema
export const angleMeasurements = pgTable("angle_measurements", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id")
    .notNull()
    .references(() => images.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  angle: real("angle").notNull(),
  angle2: real("angle2").notNull(), // Second angle measurement
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  memo: text("memo"), // Added memo field
  iconIds: text("icon_ids"), // Store as JSON string of up to 3 icon IDs
});

// Session schema (for connect-pg-simple)
export const sessionTable = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Define relations after all tables are defined
export const usersRelations = relations(users, ({ many }: { many: any }) => ({
  images: many(images),
  angleMeasurements: many(angleMeasurements),
}));

export const imagesRelations = relations(
  images,
  ({ one, many }: { one: any; many: any }) => ({
    user: one(users, {
      fields: [images.userId],
      references: [users.id],
    }),
    angleMeasurements: many(angleMeasurements),
  }),
);

export const angleMeasurementsRelations = relations(
  angleMeasurements,
  ({ one }: { one: any }) => ({
    user: one(users, {
      fields: [angleMeasurements.userId],
      references: [users.id],
    }),
    image: one(images, {
      fields: [angleMeasurements.imageId],
      references: [images.id],
    }),
  }),
);

// Create schemas for inserts
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertImageSchema = createInsertSchema(images).pick({
  userId: true,
  hashKey: true,
  processedAngle: true,
  processedAngle2: true,
  isProcessed: true
});

export const insertAngleMeasurementSchema = createInsertSchema(
  angleMeasurements,
)
  .pick({
    imageId: true,
    userId: true,
    angle: true,
    angle2: true, // Added second angle field
    memo: true, // Added memo field
    iconIds: true, // Added iconIds field for icons
  })
  .extend({
    // Optional custom timestamp
    customTimestamp: z.date().optional(),
  });

// Exported types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

export type InsertAngleMeasurement = z.infer<
  typeof insertAngleMeasurementSchema
>;
export type AngleMeasurement = typeof angleMeasurements.$inferSelect;
