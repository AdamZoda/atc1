-- Vérifier si la colonne display_name existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='profiles' AND column_name='display_name';

-- Si elle n'existe pas, l'ajouter
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Mettre à jour les profils existants avec le nom Discord
UPDATE profiles 
SET display_name = COALESCE(display_name, username) 
WHERE display_name IS NULL;

-- Vérifier
SELECT id, username, display_name, avatar_url 
FROM profiles 
LIMIT 10;
