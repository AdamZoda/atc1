-- 1. Create blog_posts table if not exists with correct structure
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 3. Policies for blog_posts
-- Allow everyone to read published posts
DROP POLICY IF EXISTS "Anyone can read published posts" ON blog_posts;
CREATE POLICY "Anyone can read published posts" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Allow admins full access to everything
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

-- 4. Slug generation helper (optional but good for consistency)
-- This can be handled in frontend as well, but the RLS for insert is key.
