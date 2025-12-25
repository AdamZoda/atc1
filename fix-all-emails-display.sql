-- ============================================================
-- URGENT FIX: Remplacer les emails par les vrais noms partout
-- ============================================================

-- 1. Dans game_participants: remplacer username (email) par display_name
UPDATE game_participants gp
SET username = COALESCE(p.display_name, p.username)
FROM profiles p
WHERE gp.user_id = p.id
AND (gp.username LIKE '%@%.%' OR gp.username LIKE '%@%');

-- 2. Dans game_winners: remplacer username (email) par display_name
UPDATE game_winners gw
SET username = COALESCE(p.display_name, p.username)
FROM profiles p
WHERE gw.user_id = p.id
AND (gw.username LIKE '%@%.%' OR gw.username LIKE '%@%');

-- 3. Dans game_rounds: remplacer winner_name (email) par display_name
UPDATE game_rounds gr
SET winner_name = COALESCE(p.display_name, p.username)
FROM profiles p
WHERE gr.winner_id = p.id
AND (gr.winner_name LIKE '%@%.%' OR gr.winner_name LIKE '%@%');

-- 4. Dans game_chat_messages: remplacer username (email) par display_name
UPDATE game_chat_messages gcm
SET username = COALESCE(p.display_name, p.username)
FROM profiles p
WHERE gcm.user_id = p.id
AND (gcm.username LIKE '%@%.%' OR gcm.username LIKE '%@%');

-- Vérifier les résultats
SELECT 
  'game_participants' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN username LIKE '%@%' THEN 1 END) as emails_remaining
FROM game_participants
UNION ALL
SELECT 
  'game_winners' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN username LIKE '%@%' THEN 1 END) as emails_remaining
FROM game_winners
UNION ALL
SELECT 
  'game_rounds' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN winner_name LIKE '%@%' THEN 1 END) as emails_remaining
FROM game_rounds
UNION ALL
SELECT 
  'game_chat_messages' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN username LIKE '%@%' THEN 1 END) as emails_remaining
FROM game_chat_messages;

-- ============================================================
-- Afficher quelques exemples pour vérifier
-- ============================================================
SELECT 'game_participants' as source, username FROM game_participants LIMIT 5
UNION ALL
SELECT 'game_winners' as source, username FROM game_winners LIMIT 5
UNION ALL
SELECT 'game_rounds' as source, winner_name FROM game_rounds LIMIT 5
UNION ALL
SELECT 'game_chat_messages' as source, username FROM game_chat_messages LIMIT 5;
