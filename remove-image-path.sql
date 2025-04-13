-- Migration to completely remove the image_path column
-- This should be run after confirming the new serverless approach works correctly

-- Remove the image_path column from the images table
ALTER TABLE images DROP COLUMN image_path;

-- Make sure the hash_key index exists (in case previous migration wasn't run)
CREATE INDEX IF NOT EXISTS idx_images_hash_key ON images(hash_key);
