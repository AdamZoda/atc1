-- Add provider_id column to profiles table if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS provider_id TEXT;

-- Populate provider_id for existing users from auth.users
UPDATE profiles
SET provider_id = (
  SELECT auth.users.raw_user_meta_data->>'provider_id'
  FROM auth.users
  WHERE auth.users.id = profiles.id
)
WHERE provider_id IS NULL
AND EXISTS (
  SELECT 1 FROM auth.users
  WHERE auth.users.id = profiles.id
  AND auth.users.raw_user_meta_data->>'provider_id' IS NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_provider_id ON profiles(provider_id);
