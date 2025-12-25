-- ============================================
-- Table pour gérer la musique du site
-- ============================================
CREATE TABLE IF NOT EXISTS site_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  music_url TEXT NOT NULL,
  music_name TEXT NOT NULL,
  is_playing BOOLEAN DEFAULT false,
  volume INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_site_music_updated_at ON site_music(updated_at DESC);

-- Désactiver RLS pour simplifier
ALTER TABLE site_music DISABLE ROW LEVEL SECURITY;

-- Insérer une musique par défaut
INSERT INTO site_music (music_url, music_name, is_playing, volume)
VALUES ('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'Musique du Serveur', false, 50)
ON CONFLICT DO NOTHING;
