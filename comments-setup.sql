-- Create comments table with CASCADE delete
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Disable RLS for development
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Créer la table pour les commentaires About
-- ============================================
CREATE TABLE IF NOT EXISTS about_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_about_comments_created_at ON about_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_about_comments_approved ON about_comments(approved);

-- Désactiver RLS pour simplifier
ALTER TABLE about_comments DISABLE ROW LEVEL SECURITY;
