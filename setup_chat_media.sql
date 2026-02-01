-- 1. Create the 'chat-media' bucket
-- NOTE: If this fails, go to Storage > Create Bucket > "chat-media" (Make it Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Public Read Access
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Chat Media Public View" ON storage.objects;

CREATE POLICY "Chat Media Public View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-media' );

-- 3. Policy: Authenticated Upload Access
DROP POLICY IF EXISTS "Chat Media Authenticated Upload" ON storage.objects;

CREATE POLICY "Chat Media Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat-media' );
