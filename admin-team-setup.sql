-- ============================================
-- Table pour gérer la liste d'administration
-- ============================================
CREATE TABLE IF NOT EXISTS admin_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT NOT NULL,
  role TEXT NOT NULL, -- 'Owner', 'Admin', 'Modérateur', etc
  priority INTEGER NOT NULL, -- 1 = Top (Owner), 2 = Admin, 3 = Modérateur, etc
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_team_priority ON admin_team(priority);
CREATE INDEX IF NOT EXISTS idx_admin_team_created_at ON admin_team(created_at DESC);

-- Désactiver RLS pour simplifier
ALTER TABLE admin_team DISABLE ROW LEVEL SECURITY;

-- Données d'exemple (optionnel - à supprimer après test)
INSERT INTO admin_team (username, avatar_url, role, priority) VALUES
  ('ALEX', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'OWNER', 1),
  ('SARAH', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'ADMIN', 2),
  ('MARCO', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400', 'ADMIN', 2),
  ('JEAN', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'MODÉRATEUR', 3),
  ('SOPHIE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'MODÉRATEUR', 3),
  ('ALEX2', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400', 'MODÉRATEUR', 3)
ON CONFLICT DO NOTHING;
