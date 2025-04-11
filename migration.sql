
-- Convert angle columns to real (float) type
ALTER TABLE angle_measurements 
  ALTER COLUMN angle TYPE real USING angle::real,
  ALTER COLUMN angle2 TYPE real USING angle2::real;

ALTER TABLE images
  ALTER COLUMN processed_angle TYPE real USING processed_angle::real,
  ALTER COLUMN processed_angle2 TYPE real USING processed_angle2::real;


-- Add the icon_ids column to angle_measurements table if it doesn't exist
ALTER TABLE angle_measurements ADD COLUMN IF NOT EXISTS icon_ids TEXT;

-- Remove thumbnail column from images table
ALTER TABLE images DROP COLUMN IF EXISTS thumbnail_base64;

-- Create a function to convert existing JSON icon_ids to comma-separated string
CREATE OR REPLACE FUNCTION convert_icon_ids() RETURNS void AS $$
BEGIN
  UPDATE angle_measurements 
  SET icon_ids = (
    SELECT string_agg(value::text, ',')
    FROM jsonb_array_elements_text(NULLIF(icon_ids, '')::jsonb)
  )
  WHERE icon_ids IS NOT NULL AND icon_ids != '';
END;
$$ LANGUAGE plpgsql;

-- Run the conversion
SELECT convert_icon_ids();

-- Drop the conversion function
DROP FUNCTION convert_icon_ids();
