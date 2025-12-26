-- ============================================================================
-- SYNCHRONISER LES PROVIDER IDS DEPUIS DISCORD
-- ============================================================================
-- Ce script met à jour tous les provider_id manquants en récupérant les données Discord
-- depuis raw_user_meta_data->>'provider_id'

-- Étape 1: Mettre à jour les profils avec les Discord IDs depuis auth.users
UPDATE profiles
SET provider_id = (
  SELECT (au.raw_user_meta_data->>'provider_id')::text
  FROM auth.users au
  WHERE au.id = profiles.id
  LIMIT 1
)
WHERE provider_id IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = profiles.id
      AND au.raw_user_meta_data->>'provider_id' IS NOT NULL
  );

-- Afficher les résultats
SELECT 'Synchronisation des Provider IDs terminée!' as status;
SELECT COUNT(*) as "Profils avec Provider ID" FROM profiles WHERE provider_id IS NOT NULL;
SELECT COUNT(*) as "Profils SANS Provider ID" FROM profiles WHERE provider_id IS NULL;

-- Vérifier les détails
SELECT 
  p.username,
  p.id as user_id,
  p.provider_id,
  (au.raw_user_meta_data->>'provider_id')::text as "Discord ID depuis raw_user_meta_data",
  (au.raw_user_meta_data->>'name')::text as "Discord Name"
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
LIMIT 20;
