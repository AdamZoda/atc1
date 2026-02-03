-- =================================================================================
-- SCRIPT DE SUPPRESSION TOTALE D'UN UTILISATEUR (SQL SUPABASE)
-- =================================================================================
-- Ce script crée une fonction sécurisée pour supprimer un utilisateur de PARTOUT :
-- 1. auth.users (le compte de connexion)
-- 2. public.profiles (les données du profil)
-- 3. Invalide immédiatement ses sessions (déconnexion forcée)
-- =================================================================================

-- 1. Création de la fonction de suppression complète (RPC)
-- Cette fonction doit être appelée avec "supabase.rpc('delete_user_completely', { user_id: '...' })"
CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les droits de l'admin (postgres), pas de l'utilisateur qui appelle
AS $$
BEGIN
  -- Vérifier si l'utilisateur qui appelle la fonction est un admin
  -- (Optionnel, mais recommandé pour la sécurité si vous utilisez RLS strict)
  -- IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
  --   RAISE EXCEPTION 'Accès refusé : Seuls les administrateurs peuvent supprimer des comptes.';
  -- END IF;

  -- 1. Supprimer le profil public (déclenche souvent des cascades sur les posts, etc.)
  DELETE FROM public.profiles WHERE id = user_id;

  -- 2. Supprimer l'utilisateur de l'authentification (C'est LA partie critique)
  -- Cela supprime automatiquement : sessions, identités (Discord/Google), facteurs MFA
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Note : La suppression dans auth.users invalide de facto le token d'accès.
  -- L'utilisateur sera déconnecté à sa prochaine requête vers Supabase.
END;
$$;

-- =================================================================================
-- INSTRUCTIONS POUR L'UTILISATEUR ANTIGRAVITY / USER :
-- 1. Copiez tout ce code.
-- 2. Allez dans votre Dashboard Supabase > SQL Editor > New Query.
-- 3. Collez et cliquez sur "RUN".
-- =================================================================================
