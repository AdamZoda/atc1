-- ============================================
-- VÉRIFICATION DES TABLES DE MUSIQUE - VERSION CORRIGÉE
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- Les colonnes réelles de admin_logs sont: id, admin_id, admin_name, action_type, action_description, target_type, target_name, details, created_at

-- 1️⃣ VÉRIFIER SI LA TABLE site_music EXISTE
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'site_music' AND table_schema = 'public'
) as "site_music_exists";

-- 2️⃣ AFFICHER LA STRUCTURE DE LA TABLE site_music
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'site_music' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ VÉRIFIER SI LA TABLE admin_logs EXISTE
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'admin_logs' AND table_schema = 'public'
) as "admin_logs_exists";

-- 4️⃣ AFFICHER LA STRUCTURE DE LA TABLE admin_logs (VRAIES COLONNES)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_logs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5️⃣ AFFICHER LE CONTENU DE site_music (tous les enregistrements)
SELECT 
  id,
  music_url,
  music_name,
  is_playing,
  volume,
  created_at,
  updated_at
FROM site_music
ORDER BY created_at DESC;

-- 6️⃣ COMPTER LE NOMBRE DE CHANSONS DANS site_music
SELECT COUNT(*) as "Nombre de chansons" FROM site_music;

-- 7️⃣ AFFICHER L'HISTORIQUE DES UPLOADS DE MUSIQUE (derniers 20)
-- Utilise les VRAIES colonnes: admin_id, admin_name, action_type, action_description, target_type, target_name, created_at
SELECT 
  id,
  admin_id,
  admin_name,
  action_type,
  action_description,
  target_type,
  target_name,
  created_at
FROM admin_logs
WHERE action_type = 'music_upload'
ORDER BY created_at DESC
LIMIT 20;

-- 8️⃣ COMPTER LE NOMBRE D'ACTIONS MUSIQUE DANS LES LOGS
SELECT COUNT(*) as "Nombre d'actions musique" 
FROM admin_logs 
WHERE action_type LIKE 'music_%';

-- 9️⃣ AFFICHER TOUTES LES ACTIONS MUSIQUE (play, pause, volume, upload)
-- Utilise les VRAIES colonnes
SELECT 
  id,
  admin_id,
  admin_name,
  action_type,
  action_description,
  target_type,
  target_name,
  created_at
FROM admin_logs
WHERE action_type LIKE 'music_%'
ORDER BY created_at DESC
LIMIT 50;

-- 🔟 VÉRIFIER L'INTÉGRITÉ DES DONNÉES site_music
SELECT 
  CASE WHEN id IS NULL THEN '❌ ID NULL' ELSE '✅ ID OK' END as "ID",
  CASE WHEN music_url IS NULL THEN '❌ URL NULL' ELSE '✅ URL OK' END as "URL",
  CASE WHEN music_name IS NULL THEN '❌ Nom NULL' ELSE '✅ Nom OK' END as "Nom",
  CASE WHEN is_playing IS NULL THEN '❌ is_playing NULL' ELSE '✅ is_playing OK' END as "État",
  CASE WHEN volume IS NULL THEN '❌ Volume NULL' ELSE '✅ Volume OK' END as "Volume"
FROM site_music
LIMIT 1;

-- 📋 STATUT COMPLET DU SYSTÈME MUSIQUE
SELECT 
  'site_music' as "Table",
  COUNT(*) as "Nombre d'enregistrements",
  COALESCE(MAX(updated_at)::text, 'Pas de données') as "Dernière mise à jour"
FROM site_music
UNION ALL
SELECT 
  'admin_logs (musique)',
  COUNT(*),
  COALESCE(MAX(created_at)::text, 'Pas de logs')
FROM admin_logs
WHERE action_type LIKE 'music_%';

-- 🎵 BONUS: DERNIÈRE MUSIQUE UPLOADÉE + ACTIONS ASSOCIÉES
SELECT 
  'site_music' as "Source",
  music_name as "Nom",
  is_playing as "En lecture",
  volume as "Volume",
  updated_at as "Mise à jour"
FROM site_music
ORDER BY updated_at DESC
LIMIT 1;

-- Dernières actions musique
SELECT 
  admin_name,
  action_type,
  action_description,
  created_at
FROM admin_logs
WHERE action_type LIKE 'music_%'
ORDER BY created_at DESC
LIMIT 5;
