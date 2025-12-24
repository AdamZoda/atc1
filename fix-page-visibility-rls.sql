-- Désactiver RLS sur page_visibility pour permettre les updates
ALTER TABLE page_visibility DISABLE ROW LEVEL SECURITY;

-- Vérifier que la table est bien désactivée
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'page_visibility';
