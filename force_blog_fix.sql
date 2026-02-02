-- 1. Ensure the column exists
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_id UUID;

-- 2. Force the foreign key relationship
-- First, drop if exists to avoid conflicts
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_id_fkey;

-- Then add it explicitly
ALTER TABLE blog_posts 
  ADD CONSTRAINT blog_posts_author_id_fkey 
  FOREIGN KEY (author_id) 
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- 3. Verify the slug unique constraint as well
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);

-- 4. Re-enable RLS just in case
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 5. Refresh the schema for Supabase (standard policies)
DROP POLICY IF EXISTS "Anyone can read published posts" ON blog_posts;
CREATE POLICY "Anyone can read published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Admins have full access to blog_posts" ON blog_posts;
CREATE POLICY "Admins have full access to blog_posts" ON blog_posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
