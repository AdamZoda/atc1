# 🚀 Guide de Déploiement - Vercel

## Configuration Locale (Development)

### 1️⃣ Créez le fichier `.env.local`

```bash
# À la racine du projet, créez un fichier nommé .env.local
# NE LE COMMITEZ JAMAIS EN GIT
```

### 2️⃣ Copiez les variables de `.env.example`

```bash
cp .env.example .env.local
```

### 3️⃣ Remplissez avec vos clés Supabase

Ouvrez `.env.local` et remplissez :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
VITE_APP_URL=http://localhost:3000
```

### 4️⃣ Redémarrez le serveur

```bash
npm run dev
```

---

## Déploiement sur Vercel

### 1️⃣ Poussez votre code sur GitHub

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### 2️⃣ Importez le projet sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre repository GitHub
4. Sélectionnez le framework "Other"

### 3️⃣ Configurez les variables d'environnement

Dans Vercel Dashboard → Settings → Environment Variables, ajoutez :

```
VITE_SUPABASE_URL = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_xxxxx
VITE_APP_URL = https://votre-domain.vercel.app
```

⚠️ **IMPORTANT :** Ne mettez PAS `SUPABASE_SERVICE_KEY` en frontend !

### 4️⃣ Redéployez

Après avoir ajouté les variables, cliquez sur "Redeploy" ou poussez un nouveau commit.

---

## Troubleshooting

### "FAILED TO FETCH" ou "placeholder.supabase.co"

**Cause:** Variables d'environnement non chargées

**Solution:**
1. Vérifiez que `.env.local` existe localement
2. Sur Vercel, vérifiez les variables dans Settings → Environment Variables
3. Redémarrez le serveur : `npm run dev`
4. Videz le cache : `rm -rf .next node_modules/.vite`

### "RLS policy error"

**Cause:** Supabase Row Level Security mal configuré

**Solution:**
1. Allez sur dashboard.supabase.com
2. Naviguez vers SQL Editor
3. Exécutez les requêtes de `geolocation-setup.sql`
4. Activez RLS sur la table `profiles`

### Configuration error lors du chargement

**Cause:** Fichier `.env` ou `.env.local` manquant ou mal formaté

**Solution:**
- Créez `.env.local` avec vos vraies clés
- Assurez-vous qu'il n'y a pas d'espace autour du `=`
- Format correct : `KEY=value` (pas `KEY = value`)

---

## ✅ Checklist avant Déploiement

- [ ] `.env.local` créé avec vraies clés
- [ ] `.env.local` ajouté à `.gitignore`
- [ ] Variables ajoutées sur Vercel
- [ ] `VITE_SUPABASE_URL` commence par `https://`
- [ ] `VITE_SUPABASE_ANON_KEY` commence par `sb_publishable_`
- [ ] Aucun `SUPABASE_SERVICE_KEY` en frontend
- [ ] Test en local : `npm run dev`
- [ ] Build test : `npm run build`

---

## 📝 Variables d'Environnement (Référence)

| Variable | Type | Exemple | Où ? |
|----------|------|---------|------|
| `VITE_SUPABASE_URL` | Public | `https://xxx.supabase.co` | .env + Vercel |
| `VITE_SUPABASE_ANON_KEY` | Public | `sb_publishable_xxx` | .env + Vercel |
| `VITE_APP_URL` | Public | `https://atlanticrp.vercel.app` | .env + Vercel |
| `SUPABASE_SERVICE_KEY` | 🔒 Secret | `sb_secret_xxx` | ⚠️ SERVER ONLY |
| `DISCORD_CLIENT_SECRET` | 🔒 Secret | `xxx` | ⚠️ SERVER ONLY |

---

## 🔗 Ressources Utiles

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)

