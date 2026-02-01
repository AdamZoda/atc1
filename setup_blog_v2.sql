-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Tags Table (Optional but good for future)
CREATE TABLE IF NOT EXISTS blog_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 3. Update Blog Posts Table
-- We are altering the existing table to add new features
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES blog_categories(id),
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb; -- Stores the block-based content for the editor

-- 4. Create Comments Table
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE, -- Requires moderation by default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Categories: Everyone can read, Admins can manage
CREATE POLICY "Public can view categories" ON blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON blog_categories FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- Comments: Public Read (Approved only), Authenticated Insert, Admin Manage
CREATE POLICY "Public can view approved comments" ON blog_comments FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create comments" ON blog_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON blog_comments FOR DELETE USING (auth.uid() = user_id);
-- Admins can do everything with comments
CREATE POLICY "Admins can manage comments" ON blog_comments FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- 7. Functions & Triggers for Slug Generation (Simple version)
-- (We'll handle slug generation in the frontend for now to keep SQL simple, checks handled by UNIQUE constraint)
