Oui-- ============================================
-- RESET ULTRA SIMPLE - SOLUTION DÉFINITIVE
-- ============================================
-- À EXÉCUTER IMMÉDIATEMENT dans Supabase SQL Editor

-- 🛡️ ÉTAPE 1: TOUT SUPPRIMER (tables + RLS)
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS site_music CASCADE;

-- ✅ ÉTAPE 2: CRÉER site_music SANS RLS
CREATE TABLE site_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  music_url TEXT,
  music_name TEXT DEFAULT 'Aucune musique',
  is_playing BOOLEAN DEFAULT false,
  volume INTEGER DEFAULT 70,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ✅ ÉTAPE 3: CRÉER admin_logs SANS RLS
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  admin_name TEXT,
  action_type TEXT,
  action_description TEXT,
  target_type TEXT,
  target_name TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- ✅ ÉTAPE 4: INSÉRER 1 LIGNE INITIALE (SANS URL)
INSERT INTO site_music (id, music_url, music_name, is_playing, volume)
VALUES (gen_random_uuid(), NULL, 'Aucune musique - Uploadez depuis Admin', false, 70);

-- ✅ ÉTAPE 5: VÉRIFIER RLS EST BIEN OFF
ALTER TABLE site_music DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;

-- ✅ ÉTAPE 6: CONFIRMATION
SELECT '✅ BASE RÉINITIALISÉE - RLS OFF - PRÊT POUR UPLOAD!' as Status;
SELECT COUNT(*) as "site_music records" FROM site_music;
SELECT COUNT(*) as "admin_logs records" FROM admin_logs;
