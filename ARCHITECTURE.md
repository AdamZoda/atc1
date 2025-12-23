# 📊 Architecture du Projet Atlantic RP

## 🏗️ Structure Globale

```
atlantic-rp-platform/
├── 📄 Frontend (React + TypeScript + Vite)
│   ├── pages/          # Pages principales
│   ├── components/     # Composants réutilisables
│   └── assets/        # Images, styles
│
├── 🔌 Backend (Supabase)
│   ├── Authentication  # OAuth2 Discord
│   ├── Database       # PostgreSQL (profiles, locations)
│   └── Storage        # Avatars bucket
│
└── 🛠️ Infrastructure
    ├── Vercel        # Deployment
    ├── Supabase      # BaaS (Backend as a Service)
    └── Discord OAuth # Authentication Provider
```

---

## 🔐 Flux d'Authentification

```
1. Utilisateur → Clique "Login"
   ↓
2. Frontend → Redirige vers Discord OAuth
   ↓
3. Discord → Valide les credentials
   ↓
4. Frontend ← Reçoit access_token
   ↓
5. Supabase → Valide et crée session
   ↓
6. Frontend ← Session active
   ↓
7. App → Affiche LocationPermission
   ↓
8. Localisation → Sauvegardée en DB (silencieusement)
```

---

## 📱 Pages & Fonctionnalités

| Page | Fonction | Auth Requise | Admin Only |
|------|----------|--------------|-----------|
| `/` | Accueil | ❌ | ❌ |
| `/features` | Features | ❌ | ❌ |
| `/rules` | Règles du serveur | ❌ | ❌ |
| `/community` | Communauté | ❌ | ❌ |
| `/shop` | Shop | ❌ | ❌ |
| `/media` | Galerie | ✅ | ❌ |
| `/profile` | Profil utilisateur | ✅ | ❌ |
| `/admin` | Dashboard Admin | ✅ | ✅ |
| `/login` | Connexion Discord | ❌ | ❌ |
| `/signup` | Inscription | ❌ | ❌ |

---

## 🗄️ Structure de la Base de Données

### Table: `profiles`
```sql
id              UUID PRIMARY KEY (from auth.users)
username        TEXT (from Discord)
avatar_url      TEXT
role            ENUM ('user', 'admin')
banned          BOOLEAN DEFAULT false
latitude        DECIMAL(10, 8)  -- GPS Latitude
longitude       DECIMAL(11, 8)  -- GPS Longitude
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

---

## 🔑 Clés de Sécurité Requises

```env
# Supabase (Frontend Public)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx

# Supabase (Server Only)
SUPABASE_SERVICE_KEY=sb_secret_xxxxx

# Discord OAuth
DISCORD_CLIENT_ID=xxxxx
DISCORD_CLIENT_SECRET=xxxxx  # 🔒 NE JAMAIS exposer

# Application
VITE_APP_URL=https://atlanticrp.vercel.app
```

---

## 🛡️ Sécurité par Couche

### 1️⃣ Authentification (Discord OAuth2)
- ✅ Utilisateurs authentifiés via Discord
- ✅ Tokens gérés par Supabase (pas exposés)
- ✅ Sessions sécurisées

### 2️⃣ Autorisation (Row Level Security)
- ✅ Users ne peuvent voir que leurs données
- ✅ Admins ont accès à tous les profils
- ✅ Bannissement automatique appliqué

### 3️⃣ Données Sensibles
- ✅ Localisation GPS chiffrée en transmission (HTTPS)
- ✅ Jamais affichée à l'utilisateur
- ✅ Accessible uniquement aux admins

### 4️⃣ Validation des Données
- ✅ Coordinates validées (lat -90 à +90, lon -180 à +180)
- ✅ Types vérifiés
- ✅ NaN détecté

---

## 🚨 Incidents de Sécurité Historique

### 🔴 CRITIQUE - Clés Exposées
**Date:** 2025-12-23  
**Statut:** ✅ CORRIGÉ  
**Description:** Fichier `.env` commité en Git avec secrets  
**Actions:**
- Régénérez les clés Supabase
- Régénérez le secret Discord
- Nettoyez l'historique Git
- Ajoutez `.env` à `.gitignore`

---

## 📈 Checklist de Production

- [ ] Variables `.env` sécurisées (jamais en Git)
- [ ] HTTPS activé
- [ ] CORS correctement configuré
- [ ] Rate limiting activé
- [ ] Logs d'audit en place
- [ ] Backup automatique en place
- [ ] Monitoring activé
- [ ] 2FA pour les admins
- [ ] Certificats SSL/TLS valides
- [ ] WAF (Web Application Firewall) configuré

---

## 🔄 Cycle de Déploiement

```
Local Dev
   ↓
GitHub (push)
   ↓
Vercel (auto-deploy)
   ↓
Production (atlanticrp.vercel.app)
   ↓
Supabase Production DB
```

**Environnements :**
- 🟢 **Development** - localhost:3000
- 🟡 **Staging** - vercel preview
- 🔴 **Production** - atlanticrp.vercel.app

---

## 📞 Contacts Sécurité

- 🐞 Bug Bounty: security@atlanticrp.dev
- 📧 Email: admin@atlanticrp.dev
- 💬 Discord: [Serveur Discord]

