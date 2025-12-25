-- ============================================
-- RÉINITIALISATION COMPLÈTE - SYSTÈME MUSIQUE
-- ============================================
-- ATTENTION: Ce script SUPPRIME et RECRÉE tout
-- Exécutez ceci dans Supabase SQL Editor

-- ⚠️ ÉTAPE 1: SUPPRIMER LES TABLES EXISTANTES (ordre inversé pour respecter les dépendances)
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS site_music CASCADE;

-- 🛡️ ÉTAPE 1bis: NETTOYER TOUTE URL SOUNDHELIX OU EXTERNE (si les tables n'existaient pas avant)
-- Cette étape prévient le problème de CORS avec soundhelix.co

-- ✅ ÉTAPE 2: CRÉER LA TABLE site_music (PROPRE ET SIMPLE)
CREATE TABLE site_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  music_url TEXT DEFAULT NULL,
  music_name TEXT DEFAULT 'Aucune musique sélectionnée',
  is_playing BOOLEAN DEFAULT false,
  volume INTEGER DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ✅ ÉTAPE 3: CRÉER LA TABLE admin_logs (PROPRE ET SIMPLE)
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  admin_name TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT,
  target_type TEXT,
  target_name TEXT,
  details JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ✅ ÉTAPE 4: INSÉRER UNE LIGNE INITIALE DANS site_music (SANS URL EXTERNE)
INSERT INTO site_music (music_url, music_name, is_playing, volume)
VALUES (
  NULL,
  'Aucune musique - Uploadez une chanson depuis l''Admin Panel',
  false,
  70
);

-- ✅ ÉTAPE 5: CRÉER LES INDEX POUR LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_music_updated_at ON site_music(updated_at DESC);

-- ✅ ÉTAPE 6: DÉSACTIVER RLS (pour simplifier - production devrait avoir RLS)
ALTER TABLE site_music DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;

-- ✅ ÉTAPE 7: VÉRIFIER QUE TOUT EST OK
SELECT '✅ TABLES CRÉÉES AVEC SUCCÈS!' as "Status";

-- Afficher site_music
SELECT 'site_music' as "Table", COUNT(*) as "Enregistrements" FROM site_music;

-- Afficher admin_logs
SELECT 'admin_logs' as "Table", COUNT(*) as "Enregistrements" FROM admin_logs;

-- ✅ ÉTAPE 8: VÉRIFIER LA STRUCTURE
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'site_music'
ORDER BY ordinal_position;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_logs'
ORDER BY ordinal_position;
