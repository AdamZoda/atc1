-- Désactiver RLS sur background_history pour permettre les insertions
ALTER TABLE background_history DISABLE ROW LEVEL SECURITY;

-- Vérifier que c'est bien désactivé
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'background_history';
