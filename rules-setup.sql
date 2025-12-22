-- Create rule_categories table
CREATE TABLE IF NOT EXISTS rule_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rules table
CREATE TABLE IF NOT EXISTS rules (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES rule_categories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rules_category_id ON rules(category_id);
CREATE INDEX IF NOT EXISTS idx_rules_order ON rules("order");

-- Disable RLS for development
ALTER TABLE rule_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE rules DISABLE ROW LEVEL SECURITY;

-- Insert example data
INSERT INTO rule_categories (name, description) VALUES
  ('Comportement Général', 'Règles de conduite générale sur le serveur'),
  ('Combat et PvP', 'Règles concernant les combats et le PvP'),
  ('Économie', 'Règles de gestion économique')
ON CONFLICT DO NOTHING;

INSERT INTO rules (category_id, title, content, "order") VALUES
  (1, 'Respecter les autres joueurs', 'Aucune insulte, discrimination ou harcèlement envers les autres joueurs', 1),
  (1, 'Pas de spam', 'Éviter de spammer les messages dans le chat', 2),
  (2, 'Pas de combat hors RP', 'Les combats doivent être justifiés par le RP', 1),
  (3, 'Gestion de l\'argent', 'Les transactions doivent être réalistes et justifiées', 1)
ON CONFLICT DO NOTHING;
