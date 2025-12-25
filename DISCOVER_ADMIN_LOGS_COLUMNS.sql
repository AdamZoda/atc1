-- ⚡ DÉCOUVRIR LES COLONNES RÉELLES DE admin_logs
-- Exécutez cette requête dans Supabase SQL Editor pour voir exactement quelles colonnes existent

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ensuite, vérifiez les données:
SELECT * FROM admin_logs LIMIT 5;
