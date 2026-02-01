
-- Synchronize 'status' and 'is_published' for legacy support
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Update existing rows (if status is published, set is_published to true)
UPDATE blog_posts SET is_published = (status = 'published');

-- Create a trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_blog_published_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    NEW.is_published := true;
  ELSE
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_blog_published_status ON blog_posts;
CREATE TRIGGER tr_sync_blog_published_status
BEFORE INSERT OR UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION sync_blog_published_status();

-- Update RLS Policies for blog_posts
-- Drop old restrictive policies
DROP POLICY IF EXISTS "Public can view published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can view own posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON blog_posts;

-- 1. Public can view published articles
CREATE POLICY "Public can view published articles"
ON blog_posts FOR SELECT
USING (status = 'published');

-- 2. Admins can see EVERYTHING
CREATE POLICY "Admins have full access to blog_posts"
ON blog_posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 3. Authors can manage their own articles (if not admin)
CREATE POLICY "Authors can manage own articles"
ON blog_posts FOR ALL
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
