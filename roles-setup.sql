-- ============================================
-- Table pour gérer les rôles personnalisés
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '👤',
  description TEXT,
  color TEXT DEFAULT '#D4AF37', -- luxury-gold by default
  created_at TIMESTAMP DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Désactiver RLS pour simplifier
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Données d'exemple (optionnel - à supprimer après test)
INSERT INTO roles (name, emoji, description, color) VALUES
  ('OWNER', '👑', 'Propriétaire du serveur', '#FFD700'),
  ('ADMIN', '🔧', 'Administrateur', '#FF6B6B'),
  ('MODÉRATEUR', '🛡️', 'Modérateur', '#4ECDC4'),
  ('SUPPORT', '💬', 'Support utilisateur', '#95E1D3')
ON CONFLICT DO NOTHING;
