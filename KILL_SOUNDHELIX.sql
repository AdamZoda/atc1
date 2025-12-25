-- ============================================
-- NETTOYAGE D'URGENCE - SUPPRIMER SOUNDHELIX
-- ============================================
-- Exécutez ceci si soundhelix.co bloque toujours
-- Ce script supprime TOUTE référence à des URLs externes

-- 🛡️ ÉTAPE 1: AFFICHER CE QUI SERA SUPPRIMÉ
SELECT 
  id,
  music_url,
  music_name
FROM site_music
WHERE music_url IS NOT NULL
AND (
  music_url LIKE '%soundhelix%' OR
  music_url LIKE '%youtube%' OR
  music_url LIKE '%spotify%' OR
  music_url LIKE '%cdnjs%' OR
  music_url LIKE '%examples%' OR
  NOT music_url LIKE '%supabase%'
);

-- 🛡️ ÉTAPE 2: REMPLACER TOUTES LES URLs EXTERNES PAR NULL
UPDATE site_music
SET music_url = NULL,
    music_name = 'Aucune musique (URL externe supprimée)',
    is_playing = false
WHERE music_url IS NOT NULL
AND (
  music_url LIKE '%soundhelix%' OR
  music_url LIKE '%youtube%' OR
  music_url LIKE '%spotify%' OR
  music_url LIKE '%cdnjs%' OR
  music_url LIKE '%examples%' OR
  NOT music_url LIKE '%supabase%'
);

-- 🛡️ ÉTAPE 3: VÉRIFIER QUE C'EST FAIT
SELECT 
  '✅ SOUNDHELIX BLOQUÉ!' as "Status",
  COUNT(*) as "Enregistrements avec URL",
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ Aucune chanson'
    ELSE '✅ ' || COUNT(*) || ' chanson(s) Supabase'
  END as "Résultat"
FROM site_music
WHERE music_url IS NOT NULL
AND music_url LIKE '%supabase%';

-- Afficher l'état final
SELECT 
  music_url,
  music_name,
  is_playing,
  volume
FROM site_music
LIMIT 1;

-- 🛡️ ÉTAPE 4: NETTOYER LES LOGS AUSSI (optionnel)
DELETE FROM admin_logs
WHERE action_description LIKE '%soundhelix%'
OR action_description LIKE '%youtube%'
OR action_description LIKE '%spotify%';

SELECT '✅ LOGS NETTOYÉS!' as "Status";
