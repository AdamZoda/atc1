# 🎡 SPIN-ATC Integration Plan

## 📊 ANALYSE DU PROJET SPIN-ATC-main

### 🎯 Objectif du Projet SPIN-ATC
C'est une **plateforme de roulette/spinner wheel indépendante** créée en React + Vite qui offre :
- ✅ Roulette spinner avec animation canvas
- ✅ Système de gestion des participants (WAITING/ACCEPTED)
- ✅ Panel admin avec contrôles complets
- ✅ Chat communautaire temps réel
- ✅ Historique des gagnants
- ✅ Multi-langue (FR/EN)
- ✅ Sons et animations fluides

### 📁 Structure du SPIN-ATC
```
SPIN-ATC-main/
├── App.tsx              (Application principale)
├── types.ts             (Types TypeScript)
├── constants.tsx        (Traductions + couleurs)
├── components/
│   ├── SpinnerWheel.tsx      (Roulette canvas)
│   ├── AdminPanel.tsx        (Panel admin)
│   ├── UserList.tsx          (Liste des utilisateurs)
│   ├── HistoryList.tsx       (Historique)
│   └── ChatBox.tsx           (Chat)
└── CSS/Tailwind intégré
```

### 🔑 Caractéristiques Principales du SPIN

#### SpinnerWheel.tsx
- Canvas-based wheel drawing
- Smooth easing animation (easeOutQuart)
- Sound effects on tick (Web Audio API)
- Dynamic slice generation based on participants
- Winner calculation based on final rotation angle

#### AdminPanel.tsx
- Accept individual users
- Accept all users at once
- Start spin animation
- Clear all participants
- Toggle chat visibility
- Toggle game page visibility
- Chat mode (Public/Staff Only)

#### UserList.tsx & HistoryList.tsx
- Display waiting list
- Display accepted participants
- Show previous winners
- Join/Leave actions

#### ChatBox.tsx
- Real-time chat
- Admin messages
- User restriction toggle

---

## 🔄 STRATÉGIE D'INTÉGRATION

### Option A: FUSION COMPLÈTE (RECOMMANDÉE)
**Remplacer la page Game.tsx actuelle par la version SPIN améliorée avec Supabase**

**Avantages:**
- ✅ Meilleure UX (canvas animation vs SVG)
- ✅ Sons intégrés
- ✅ Chat en direct
- ✅ Code production-ready
- ✅ Performance optimisée

**Processus:**
1. Extraire les composants du SPIN-ATC
2. Les placer dans `pages/` et `components/`
3. Intégrer Supabase pour persistance
4. Remplacer les mock data par des vraies données
5. Adapter au design Atlantic RP (couleurs or/noir)

### Option B: COMPOSANT INTÉGRÉ
**Garder le dossier SPIN-ATC et l'importer comme sous-application**

**Avantages:**
- ✅ Isolation claire
- ✅ Pas de refactoring majeur
- ✅ Facile à maintenir séparément

**Inconvénients:**
- ❌ Deux systèmes de design
- ❌ Duplication de dépendances

---

## 🗄️ STRUCTURE DE BASE DE DONNÉES (SUPABASE)

### Tables Requises

```sql
-- 1. GAME PARTICIPANTS
CREATE TABLE game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'WAITING', -- WAITING, ACCEPTED
  game_round UUID REFERENCES game_rounds(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_round)
);

-- 2. GAME ROUNDS (Tracks each spin)
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'IDLE', -- IDLE, SPINNING, FINISHED
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  participant_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- 3. GAME WINNERS (History)
CREATE TABLE game_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  game_round UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  prize TEXT DEFAULT 'Spin Winner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. CHAT MESSAGES (Optional but in SPIN)
CREATE TABLE game_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE, -- For admin chat filtering
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ADMIN SETTINGS (For chat/page visibility)
CREATE TABLE game_admin_settings (
  id UUID PRIMARY KEY DEFAULT 'game-settings',
  chat_enabled BOOLEAN DEFAULT TRUE,
  page_visible BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- INDEXES
CREATE INDEX idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX idx_game_participants_status ON game_participants(status);
CREATE INDEX idx_game_rounds_status ON game_rounds(status);
CREATE INDEX idx_game_winners_created_at ON game_winners(created_at DESC);
CREATE INDEX idx_chat_messages_created_at ON game_chat_messages(created_at DESC);

-- RLS POLICIES
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_admin_settings ENABLE ROW LEVEL SECURITY;

-- PARTICIPANTS: Everyone can view, users can insert their own
CREATE POLICY "view_all_participants" ON game_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_own_participation" ON game_participants
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_participants" ON game_participants
  FOR UPDATE TO authenticated 
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ROUNDS: Everyone can view, admins can manage
CREATE POLICY "view_all_rounds" ON game_rounds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_rounds" ON game_rounds
  FOR ALL TO authenticated 
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- WINNERS: Everyone can view, admins can insert
CREATE POLICY "view_all_winners" ON game_winners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_insert_winners" ON game_winners
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- CHAT: Everyone can view, users can insert, admins can manage visibility
CREATE POLICY "view_chat_messages" ON game_chat_messages
  FOR SELECT TO authenticated 
  USING (is_visible = TRUE OR user_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "insert_chat_message" ON game_chat_messages
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_chat" ON game_chat_messages
  FOR UPDATE TO authenticated 
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- SETTINGS: Admins only
CREATE POLICY "view_settings" ON game_admin_settings
  FOR SELECT USING (true);

CREATE POLICY "admin_update_settings" ON game_admin_settings
  FOR UPDATE TO authenticated 
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_insert_settings" ON game_admin_settings
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## 🎨 ADAPTATION AU DESIGN ATLANTIC RP

Les couleurs du SPIN doivent être adaptées:

```typescript
// SPIN-ATC colors (Original)
const WHEEL_COLORS = [
  '#FBBF24', // Amber
  '#F59E0B', // Amber darker
  '#D97706', // Amber even darker
  '#B45309', // Brown-ish
  '#111827', // Dark gray
  '#374151', // Lighter dark gray
];

// ATLANTIC RP colors (Adapted)
const WHEEL_COLORS = [
  '#D4AF37', // luxury-gold
  '#E8D5B7', // luxury-goldLight
  '#C9B037', // darker gold
  '#F0E6D2', // very light gold
  '#1a1a1a', // dark
  '#2a2a2a', // darker gray
];

// Backgrounds
const BG_COLORS = {
  primary: '#1a1a1a',    // luxury-dark
  secondary: 'rgba(255, 255, 255, 0.05)', // white/5
  border: 'rgba(255, 255, 255, 0.1)',    // white/10
};
```

---

## ✅ ÉTAPES D'IMPLÉMENTATION

### Phase 1: Préparation
- [x] Analyser SPIN-ATC
- [ ] Créer tables SQL dans Supabase
- [ ] Adapter couleurs/design
- [ ] Extraire composants

### Phase 2: Intégration
- [ ] Remplacer Game.tsx par version SPIN intégrée
- [ ] Connecter à Supabase
- [ ] Tester fonctionnalités

### Phase 3: Optimisation
- [ ] Persistance des données
- [ ] Temps réel (subscriptions)
- [ ] Permissions admin
- [ ] Chat

### Phase 4: Déploiement
- [ ] Tests E2E
- [ ] Documentation
- [ ] Push GitHub

---

## 🚀 PROCHAINES ÉTAPES

1. **Exécuter le SQL** → Créer tables Supabase
2. **Extraire SPIN** → Copier composants adaptés
3. **Intégrer Supabase** → Remplacer mock data
4. **Tester** → Vérifier toutes les fonctionnalités

---

**Status:** 📋 Plan d'intégration prêt - SQL fourni ci-dessous
