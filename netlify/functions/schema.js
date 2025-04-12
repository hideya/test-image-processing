const {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  real,
} = require("drizzle-orm/pg-core");
const { relations } = require("drizzle-orm");
const { createInsertSchema } = require("drizzle-zod");
const { z } = require("zod");

// User schema
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

// Image schema
const images = pgTable("images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  imagePath: text("image_path").notNull(),
  hashKey: text("hash_key").notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  processedAngle: real("processed_angle"),
  processedAngle2: real("processed_angle2"), // Second angle measurement
  isProcessed: boolean("is_processed").default(false),
});

// Angle measurement schema
const angleMeasurements = pgTable("angle_measurements", {
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
const sessionTable = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Define relations after all tables are defined
const usersRelations = relations(users, ({ many }) => ({
  images: many(images),
  angleMeasurements: many(angleMeasurements),
}));

const imagesRelations = relations(
  images,
  ({ one, many }) => ({
    user: one(users, {
      fields: [images.userId],
      references: [users.id],
    }),
    angleMeasurements: many(angleMeasurements),
  }),
);

const angleMeasurementsRelations = relations(
  angleMeasurements,
  ({ one }) => ({
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
const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

const insertImageSchema = createInsertSchema(images).pick({
  userId: true,
  imagePath: true,
  hashKey: true,
});

const insertAngleMeasurementSchema = createInsertSchema(
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

module.exports = {
  users,
  images,
  angleMeasurements,
  sessionTable,
  usersRelations,
  imagesRelations,
  angleMeasurementsRelations,
  insertUserSchema,
  insertImageSchema,
  insertAngleMeasurementSchema
};
