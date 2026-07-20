-- Add supporting columns to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';

-- Create a storage bucket for building images if it doesn't exist (using existing properties bucket is fine, but ensuring policies)
-- (Assuming 'properties' bucket exists from previous context)
