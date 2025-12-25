-- Vérifier si la colonne provider_id existe dans la table profiles
-- Si elle n'existe pas, la créer

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider_id text;

-- Créer un index si nécessaire
CREATE INDEX IF NOT EXISTS idx_profiles_provider_id ON profiles(provider_id);

-- Afficher la structure de la table pour vérifier
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='profiles';
