-- Script pour remplir les avatars Discord manquants
-- Pour chaque profil, on va chercher l'avatar Discord via l'ID utilisateur

-- Étape 1: Afficher les utilisateurs sans avatar
SELECT id, username, avatar_url, created_at 
FROM profiles 
WHERE avatar_url IS NULL 
ORDER BY created_at DESC;

-- Étape 2: Mettre à jour les utilisateurs qui ont un display_name Discord
-- (ils ont probablement une identité Discord)
UPDATE profiles 
SET avatar_url = CASE 
  WHEN display_name = 'ADAM' THEN 'https://cdn.discordapp.com/avatars/ID_DISCORD_HERE/HASH.png'
  WHEN display_name = 'fahd' THEN 'https://cdn.discordapp.com/avatars/ID_DISCORD_HERE/HASH.png'
  WHEN display_name = 'admin' THEN 'https://cdn.discordapp.com/avatars/ID_DISCORD_HERE/HASH.png'
  ELSE avatar_url
END
WHERE avatar_url IS NULL;

-- Note: Vous devez:
-- 1. Aller dans Discord Developer Portal → Application
-- 2. Pour chaque utilisateur, récupérer son ID Discord et son avatar hash
-- 3. Remplacer ID_DISCORD_HERE et HASH dans les URLs ci-dessus

-- Vérification
SELECT id, username, display_name, avatar_url 
FROM profiles 
WHERE avatar_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 15;
