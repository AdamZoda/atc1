-- Create page_visibility table
CREATE TABLE IF NOT EXISTS page_visibility (
  id TEXT PRIMARY KEY,
  page_name TEXT NOT NULL UNIQUE,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Insert default pages
INSERT INTO page_visibility (id, page_name, is_visible) VALUES
  ('page-home', 'Home', true),
  ('page-features', 'Features', true),
  ('page-rules', 'Rules', true),
  ('page-community', 'Community', true),
  ('page-game', 'Game', true),
  ('page-shop', 'Shop', true),
  ('page-gallery', 'Gallery', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
ALTER TABLE page_visibility ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select on page_visibility" ON page_visibility;
DROP POLICY IF EXISTS "Allow admin to update page_visibility" ON page_visibility;

-- Allow anyone to select
CREATE POLICY "Allow select on page_visibility" ON page_visibility
  FOR SELECT USING (true);

-- Allow only admin to update (via function)
CREATE POLICY "Allow admin to update page_visibility" ON page_visibility
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  ) WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create function to update page visibility
CREATE OR REPLACE FUNCTION update_page_visibility(
  p_page_id TEXT,
  p_is_visible BOOLEAN
)
RETURNS page_visibility AS $$
BEGIN
  UPDATE page_visibility
  SET is_visible = p_is_visible, updated_at = now()
  WHERE id = p_page_id;
  
  RETURN (SELECT * FROM page_visibility WHERE id = p_page_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function to authenticated users (they need admin role checked in function)
GRANT EXECUTE ON FUNCTION update_page_visibility TO authenticated;
