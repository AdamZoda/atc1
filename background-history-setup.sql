-- Créer la table pour l'historique des backgrounds
CREATE TABLE IF NOT EXISTS background_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  background_url TEXT NOT NULL,
  background_type TEXT NOT NULL CHECK (background_type IN ('image', 'video')),
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT now(),
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_background_history_changed_at ON background_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_history_is_current ON background_history(is_current);

-- RLS Policies
ALTER TABLE background_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select history (read-only)
DROP POLICY IF EXISTS "Allow select on background_history" ON background_history;
CREATE POLICY "Allow select on background_history" ON background_history
  FOR SELECT USING (true);

-- Allow only admin to insert
DROP POLICY IF EXISTS "Allow admin to insert background_history" ON background_history;
CREATE POLICY "Allow admin to insert background_history" ON background_history
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Allow only admin to update (for is_current flag)
DROP POLICY IF EXISTS "Allow admin to update background_history" ON background_history;
CREATE POLICY "Allow admin to update background_history" ON background_history
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  ) WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to add background to history
CREATE OR REPLACE FUNCTION add_background_to_history(
  p_background_url TEXT,
  p_background_type TEXT,
  p_changed_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Marquer l'ancien comme non-courant
  UPDATE background_history 
  SET is_current = false 
  WHERE is_current = true;
  
  -- Insérer le nouveau
  INSERT INTO background_history (background_url, background_type, changed_by, is_current)
  VALUES (p_background_url, p_background_type, p_changed_by, true)
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_background_to_history TO authenticated;
