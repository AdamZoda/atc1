-- ============================================================================
-- ATLANTIC RP - GAME/SPIN TABLES & POLICIES
-- SQL Script pour Supabase
-- À exécuter dans: Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. TABLE: game_rounds (CRÉÉ EN PREMIER!)
-- Trace chaque spin/tirage au sort
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'SPINNING', 'FINISHED')),
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  participant_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- ============================================================================
-- 2. TABLE: game_participants
-- Gère les participants au jeu (en attente ou acceptés)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACCEPTED')),
  game_round UUID REFERENCES game_rounds(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_round)
);

-- ============================================================================
-- 3. TABLE: game_winners
-- Historique des gagnants
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  game_round UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  prize TEXT DEFAULT 'Spin Winner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. TABLE: game_chat_messages
-- Chat communautaire intégré au jeu
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. TABLE: game_admin_settings
-- Paramètres admin (visibilité chat, visibilité page jeu, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'game-settings',
  chat_enabled BOOLEAN DEFAULT TRUE,
  page_visible BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES - Pour optimiser les requêtes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_status ON game_participants(status);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_round ON game_participants(game_round);
CREATE INDEX IF NOT EXISTS idx_game_participants_created_at ON game_participants(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds(status);
CREATE INDEX IF NOT EXISTS idx_game_rounds_winner_id ON game_rounds(winner_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_created_at ON game_rounds(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_winners_user_id ON game_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_game_round ON game_winners(game_round);
CREATE INDEX IF NOT EXISTS idx_game_winners_created_at ON game_winners(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_chat_messages_created_at ON game_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_is_visible ON game_chat_messages(is_visible);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Sécurité au niveau des lignes
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES: game_participants
-- ============================================================================

-- Tout le monde peut voir tous les participants
CREATE POLICY "allow_view_all_participants"
  ON game_participants FOR SELECT
  TO authenticated
  USING (true);

-- Les utilisateurs peuvent s'inscrire (ajouter leur participation)
CREATE POLICY "allow_user_insert_own_participation"
  ON game_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent voir/modifier leur propre participation
CREATE POLICY "allow_user_manage_own_participation"
  ON game_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les admins peuvent accepter les participants
CREATE POLICY "allow_admin_update_participants"
  ON game_participants FOR UPDATE
  TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Les admins peuvent supprimer des participants
CREATE POLICY "allow_admin_delete_participants"
  ON game_participants FOR DELETE
  TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- POLICIES: game_rounds
-- ============================================================================

-- Tout le monde peut voir les rounds
CREATE POLICY "allow_view_all_rounds"
  ON game_rounds FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins peuvent créer/modifier/supprimer les rounds
CREATE POLICY "allow_admin_manage_rounds"
  ON game_rounds FOR ALL
  TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- POLICIES: game_winners
-- ============================================================================

-- Tout le monde peut voir l'historique des gagnants
CREATE POLICY "allow_view_all_winners"
  ON game_winners FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins peuvent ajouter des gagnants
CREATE POLICY "allow_admin_insert_winners"
  ON game_winners FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- POLICIES: game_chat_messages
-- ============================================================================

-- Tout le monde peut voir les messages visibles
CREATE POLICY "allow_view_public_chat"
  ON game_chat_messages FOR SELECT
  TO authenticated
  USING (is_visible = TRUE OR user_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Les utilisateurs peuvent envoyer des messages
CREATE POLICY "allow_user_insert_chat_message"
  ON game_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leurs propres messages
CREATE POLICY "allow_user_update_own_chat"
  ON game_chat_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les admins peuvent modifier la visibilité des messages
CREATE POLICY "allow_admin_manage_chat_visibility"
  ON game_chat_messages FOR UPDATE
  TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- POLICIES: game_admin_settings
-- ============================================================================

-- Tout le monde peut voir les paramètres
CREATE POLICY "allow_view_settings"
  ON game_admin_settings FOR SELECT
  USING (true);

-- Seuls les admins peuvent modifier les paramètres
CREATE POLICY "allow_admin_update_settings"
  ON game_admin_settings FOR UPDATE
  TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seuls les admins peuvent insérer les paramètres
CREATE POLICY "allow_admin_insert_settings"
  ON game_admin_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- DONNÉES INITIALES (optionnel)
-- ============================================================================

-- Insérer les paramètres par défaut
INSERT INTO game_admin_settings (id, chat_enabled, page_visible, updated_at)
VALUES ('game-settings', TRUE, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- Créer le premier round
INSERT INTO game_rounds (status, created_at)
SELECT 'IDLE', NOW()
WHERE NOT EXISTS (SELECT 1 FROM game_rounds LIMIT 1);

-- ============================================================================
-- FIN DU SCRIPT SQL
-- ============================================================================
-- Status: ✅ Prêt à exécuter
-- Note: N'oubliez pas d'activer les réplications temps réel (Real-time) dans Supabase
--       pour que la page Jeu se mette à jour en direct !
-- ============================================================================
