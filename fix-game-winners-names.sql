-- ============================================================
-- FIX: Ajouter les noms d'utilisateurs à game_winners
-- Problème: Les emails s'affichent au lieu des noms d'utilisateurs
-- ============================================================

-- 1. Ajouter une colonne display_name si elle n'existe pas
ALTER TABLE game_winners 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Récupérer les noms depuis les profils pour tous les gagnants
UPDATE game_winners gw
SET 
  username = COALESCE(p.username, gw.username),
  display_name = COALESCE(p.display_name, p.username),
  avatar_url = COALESCE(p.avatar_url, gw.avatar_url)
FROM profiles p
WHERE gw.user_id = p.id
AND (gw.display_name IS NULL OR gw.display_name = '');

-- 3. Pour les entrées sans display_name, utiliser username comme fallback
UPDATE game_winners 
SET display_name = username
WHERE (display_name IS NULL OR display_name = '')
AND username IS NOT NULL;

-- 4. Vérifier le résultat
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  created_at
FROM game_winners
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- NOTE: Le code frontend devra afficher display_name
-- au lieu de username (qui peut être un email)
-- ============================================================
