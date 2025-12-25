-- ============================================================
-- SOLUTION FINALE: Créer des VUES (Views) pour afficher les vrais noms
-- Les requêtes frontend utiliseront ces vues au lieu des tables directes
-- ============================================================

-- 1. VUE: game_participants_with_names
-- Joint game_participants avec profiles pour récupérer display_name
CREATE OR REPLACE VIEW game_participants_with_names AS
SELECT 
  gp.id,
  gp.user_id,
  COALESCE(p.display_name, p.username) as username,
  COALESCE(p.avatar_url, gp.avatar_url) as avatar_url,
  gp.status,
  gp.game_round,
  gp.created_at
FROM game_participants gp
LEFT JOIN profiles p ON gp.user_id = p.id;

-- 2. VUE: game_winners_with_names
-- Joint game_winners avec profiles pour récupérer display_name
CREATE OR REPLACE VIEW game_winners_with_names AS
SELECT 
  gw.id,
  gw.user_id,
  COALESCE(p.display_name, p.username) as username,
  COALESCE(p.avatar_url, gw.avatar_url) as avatar_url,
  gw.game_round,
  gw.prize,
  gw.created_at
FROM game_winners gw
LEFT JOIN profiles p ON gw.user_id = p.id;

-- 3. VUE: game_chat_messages_with_names
-- Joint game_chat_messages avec profiles pour récupérer display_name
CREATE OR REPLACE VIEW game_chat_messages_with_names AS
SELECT 
  gcm.id,
  gcm.user_id,
  COALESCE(p.display_name, p.username) as username,
  COALESCE(p.avatar_url, gcm.avatar_url) as avatar_url,
  gcm.message,
  gcm.is_admin,
  gcm.is_visible,
  gcm.created_at
FROM game_chat_messages gcm
LEFT JOIN profiles p ON gcm.user_id = p.id;

-- 4. VUE: game_rounds_with_names
-- Joint game_rounds avec profiles pour récupérer le nom du gagnant
CREATE OR REPLACE VIEW game_rounds_with_names AS
SELECT 
  gr.id,
  gr.status,
  gr.winner_id,
  COALESCE(p.display_name, p.username) as winner_name,
  gr.participant_count,
  gr.created_at,
  gr.started_at,
  gr.ended_at
FROM game_rounds gr
LEFT JOIN profiles p ON gr.winner_id = p.id;

-- ============================================================
-- VERIFICATION: Tester les vues (Commenté - décommentez pour tester)
-- ============================================================
-- SELECT 'game_participants_with_names' as view_name, username as name FROM game_participants_with_names LIMIT 3
-- UNION ALL
-- SELECT 'game_winners_with_names' as view_name, username as name FROM game_winners_with_names LIMIT 3
-- UNION ALL
-- SELECT 'game_chat_messages_with_names' as view_name, username as name FROM game_chat_messages_with_names LIMIT 3
-- UNION ALL
-- SELECT 'game_rounds_with_names' as view_name, winner_name as name FROM game_rounds_with_names LIMIT 3;
