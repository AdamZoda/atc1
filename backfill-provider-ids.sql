-- BACKFILL provider_id pour tous les utilisateurs existants qui ont une identité Discord
-- Ce script récupère l'ID Discord depuis auth.identities et le copie dans profiles.provider_id
-- Essaie les champs possibles: 'sub', 'id', 'provider_id'

UPDATE profiles p
SET provider_id = (
  SELECT COALESCE(
    identity_data->>'sub',
    identity_data->>'id',
    identity_data->>'provider_id'
  )
  FROM auth.identities 
  WHERE auth.identities.user_id = p.id 
  AND auth.identities.provider = 'discord'
  LIMIT 1
)
WHERE provider_id IS NULL
AND EXISTS (
  SELECT 1 
  FROM auth.identities 
  WHERE auth.identities.user_id = p.id 
  AND auth.identities.provider = 'discord'
);

-- Vérifier les résultats
SELECT COUNT(*) as total_profiles, 
       COUNT(provider_id) as with_provider_id,
       COUNT(*) - COUNT(provider_id) as without_provider_id
FROM profiles;
