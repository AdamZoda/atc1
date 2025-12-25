-- Ajouter la colonne can_edit_profile à la table profiles
-- Par défaut FALSE = l'utilisateur ne peut pas modifier son profil
-- L'admin peut mettre à TRUE pour autoriser

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_edit_profile BOOLEAN DEFAULT FALSE;

-- Comment utiliser:
-- UPDATE profiles SET can_edit_profile = TRUE WHERE id = 'user_id';  // Autoriser un user
-- UPDATE profiles SET can_edit_profile = FALSE WHERE id = 'user_id'; // Refuser un user
-- SELECT can_edit_profile FROM profiles WHERE id = 'user_id';        // Vérifier status

-- Vérification
SELECT id, username, can_edit_profile FROM profiles LIMIT 10;
