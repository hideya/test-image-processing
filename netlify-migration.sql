-- Migration to make imagePath nullable to support serverless functions
-- This should be run on your database before deploying the updated code

-- Alter the images table to make image_path nullable
ALTER TABLE images ALTER COLUMN image_path DROP NOT NULL;

-- If you need to add an index for faster queries by hash_key
CREATE INDEX IF NOT EXISTS idx_images_hash_key ON images(hash_key);
