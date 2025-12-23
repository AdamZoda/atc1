# 🎮 Atlantic RP - Plateforme Web

Plateforme web pour serveur FiveM avec authentification Discord, gestion des profils et demande de localisation.

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
```bash
cp .env.example .env.local
# Remplissez .env.local avec vos clés Supabase
```

### 3. Lancement du serveur
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

---

## 📋 Configuration des Variables

Créez un fichier `.env.local` à la racine avec :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
VITE_APP_URL=http://localhost:3000
```

**Notes:**
- ❌ Ne commitez JAMAIS `.env.local` en Git
- ❌ Ne mettez PAS de clés secrètes en frontend
- ✅ `.env.local` est déjà dans `.gitignore`

---

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓
Supabase (Authentication + Database)
    ↓
PostgreSQL (Profiles, Locations)
```

**Pages:**
- `/` - Accueil
- `/login` - Connexion Discord
- `/signup` - Inscription
- `/profile` - Profil utilisateur
- `/admin` - Dashboard Admin (admin only)
- `/media` - Galerie (users only)

---

## 🔐 Fonctionnalités

✅ **Authentification Discord OAuth2**
✅ **Gestion des profils utilisateur**
✅ **Demande silencieuse de localisation GPS**
✅ **Système d'admin avec permissions**
✅ **Support multi-langue**
✅ **Design responsive**

---

## 📱 Demande de Localisation

L'application demande la localisation GPS de l'utilisateur :
- 📍 Captée silencieusement (jamais affichée à l'utilisateur)
- 🔒 Enregistrée en base de données (sécurisée)
- 👨‍💼 Visible uniquement aux admins
- ❌ Si refusée, l'utilisateur accède quand même au site

---

## 🛠️ Commandes Disponibles

```bash
npm run dev      # Démarrage du serveur local
npm run build    # Build pour production
npm run preview  # Aperçu du build
```

---

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture du projet
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement Vercel
- [SECURITY.md](./SECURITY.md) - Guide de sécurité
- [.env.example](./.env.example) - Variables d'environnement

---

## 🐛 Troubleshooting

### "FAILED TO FETCH"
→ Vérifiez que `.env.local` existe avec les bonnes clés

### "Supabase placeholder error"
→ Redémarrez le serveur après configuration

### "RLS policy error"
→ Activez Row Level Security sur Supabase

---

## 🚀 Déploiement sur Vercel

1. Poussez sur GitHub
2. Importez le repo sur Vercel
3. Ajoutez les variables d'environnement
4. Déployez !

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour plus de détails.

---

## 📞 Support

- 📧 Email: admin@atlanticrp.dev
- 💬 Discord: [Lien Discord]
- 🐛 Issues: GitHub Issues

---

## 📄 Licence

Propriétaire - Atlantic RP
