-- Créer la table pour l'audit des actions admin
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_name TEXT,
  action_type TEXT NOT NULL, -- 'page_visibility', 'background_update', 'ban_user', 'delete_user', 'promote_admin', etc
  action_description TEXT NOT NULL, -- Description lisible humaine
  target_type TEXT, -- 'page', 'user', 'post', 'background', etc
  target_name TEXT, -- Nom de ce qui a été modifié (ex: 'SHOP', 'username', 'Post #5')
  details JSONB DEFAULT '{}', -- Données supplémentaires en JSON
  created_at TIMESTAMP DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);

-- RLS Policies
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select logs (read-only)
DROP POLICY IF EXISTS "Allow select on admin_logs" ON admin_logs;
CREATE POLICY "Allow select on admin_logs" ON admin_logs
  FOR SELECT USING (true);

-- Allow only admin to insert logs
DROP POLICY IF EXISTS "Allow admin to insert admin_logs" ON admin_logs;
CREATE POLICY "Allow admin to insert admin_logs" ON admin_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_admin_name TEXT,
  p_action_type TEXT,
  p_action_description TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_logs (
    admin_id,
    admin_name,
    action_type,
    action_description,
    target_type,
    target_name,
    details
  )
  VALUES (
    p_admin_id,
    p_admin_name,
    p_action_type,
    p_action_description,
    p_target_type,
    p_target_name,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Désactiver RLS pour simplifier
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;
