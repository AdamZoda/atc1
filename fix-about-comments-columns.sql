-- Ajouter les colonnes manquantes à about_comments si elles n'existent pas
ALTER TABLE about_comments 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Créer un index sur user_id pour les performances
CREATE INDEX IF NOT EXISTS idx_about_comments_user_id ON about_comments(user_id);

-- ====================================================================
-- IMPORTANT: Mettre à jour les anciens commentaires avec les vrais noms
-- ====================================================================

-- 1. D'abord, essayer de remplir user_id si on peut le trouver depuis l'email
UPDATE about_comments ac
SET user_id = au.id
FROM auth.users au
WHERE ac.user_id IS NULL 
AND au.email = ac.username
AND ac.username LIKE '%@%.%'; -- C'est un email

-- 2. Récupérer les display_name et avatar_url depuis les profils pour les commentaires avec user_id
UPDATE about_comments ac
SET 
  display_name = COALESCE(p.display_name, p.username, ac.username),
  avatar_url = p.avatar_url
FROM profiles p
WHERE ac.user_id = p.id
AND (ac.display_name IS NULL OR ac.display_name = '');

-- 3. Pour les commentaires sans user_id, utiliser le username comme display_name
UPDATE about_comments 
SET display_name = username 
WHERE display_name IS NULL OR display_name = '';

-- Vérifier le résultat
SELECT 
  id, 
  user_id, 
  username, 
  display_name,
  avatar_url,
  SUBSTRING(message, 1, 30) as message_preview, 
  approved, 
  created_at 
FROM about_comments 
ORDER BY created_at DESC
LIMIT 10;
