-- ============================================
-- FORCE DÉSACTIVATION RLS - FIX URGENT
-- ============================================
-- Cette script FORCE la désactivation de Row Level Security
-- Exécutez ceci si vous avez l'erreur "violates row-level security policy"

-- 🛡️ ÉTAPE 1: SUPPRIMER TOUTES LES POLICIES RLS EXISTANTES
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON site_music;
DROP POLICY IF EXISTS "Enable read access for all users" ON site_music;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON site_music;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON site_music;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON admin_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON admin_logs;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON admin_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON admin_logs;

-- Supprimer TOUTES les policies (au cas où il y en aurait d'autres)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename IN ('site_music', 'admin_logs')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || 
            (SELECT tablename FROM pg_policies WHERE policyname = policy_record.policyname LIMIT 1) || ' CASCADE';
  END LOOP;
END $$;

-- 🛡️ ÉTAPE 2: DÉSACTIVER RLS COMPLÈTEMENT
ALTER TABLE site_music DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;

-- 🛡️ ÉTAPE 3: VÉRIFIER QUE RLS EST BIEN DÉSACTIVÉ
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = false THEN '✅ RLS DÉSACTIVÉ'
    ELSE '❌ RLS ACTIF'
  END as "Status"
FROM pg_tables
WHERE tablename IN ('site_music', 'admin_logs')
AND schemaname = 'public';

-- 🛡️ ÉTAPE 4: AFFICHER LES POLICIES RESTANTES (il ne devrait rien y avoir)
SELECT * FROM pg_policies 
WHERE tablename IN ('site_music', 'admin_logs');

-- 🛡️ ÉTAPE 5: VÉRIFIER QUE LES TABLES SONT INTACTES
SELECT COUNT(*) as "Enregistrements site_music" FROM site_music;
SELECT COUNT(*) as "Enregistrements admin_logs" FROM admin_logs;

SELECT '✅ RLS DÉSACTIVÉ AVEC SUCCÈS!' as "Status";
