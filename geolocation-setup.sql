-- Migration: Add geolocation columns to profiles table
-- Run this in Supabase SQL Editor if latitude/longitude columns don't exist

-- Add latitude and longitude columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Optional: Create an index on geolocation for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_geolocation 
ON profiles (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('latitude', 'longitude');
