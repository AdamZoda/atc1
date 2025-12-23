# 🔐 Guide de Sécurité - Atlantic RP

## Alertes de Sécurité Critiques

### ⚠️ CLÉS SECRÈTES EXPOSÉES
Votre fichier `.env` contient des clés secrètes qui ont été commitées en Git.

**Actions requises IMMÉDIATEMENT :**

1. **Révoquez les clés Supabase :**
   - Allez sur dashboard.supabase.com
   - Naviguez vers Settings > API
   - Régénérez `SUPABASE_SERVICE_KEY`

2. **Révoquez les secrets Discord :**
   - Allez sur Discord Developer Portal
   - Régénérez le `CLIENT_SECRET`

3. **Nettoyez l'historique Git :**
   ```bash
   # Videz le cache git
   git rm -r --cached .
   git add .
   git commit -m "Remove exposed environment variables"
   git push
   ```

---

## 🔒 Bonnes Pratiques de Sécurité

### Variables d'Environnement

**À FAIRE :**
```env
# .env.local (JAMAIS commiter)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_KEY=sb_secret_xxxxx  # ⚠️ JAMAIS en production frontend
DISCORD_CLIENT_SECRET=xxxxx
VITE_APP_URL=https://atlanticrp.vercel.app
```

**À NE PAS FAIRE :**
- ❌ Commit `.env` en Git
- ❌ Utiliser `SERVICE_KEY` en frontend
- ❌ Exposer les clés secrètes en console

### Authentification

✅ OAuth2 Discord implémenté correctement  
✅ Tokens stockés par Supabase (sécurisé)  
✅ Routes protégées pour admins  
✅ Système de ban utilisateur  

### Données Sensibles

**Localisation GPS :**
- ✅ Enregistrée en base de données
- ⚠️ Visible à l'admin uniquement
- ⚠️ Jamais affichée à l'utilisateur
- ⚠️ Pas de chiffrement (ajouter si demandé)

**Profils Utilisateur :**
- ✅ Authentification requise
- ✅ Utilisateurs ne voient que leurs données
- ✅ Admins peuvent voir tous les profils

---

## 🛡️ Checklist de Déploiement

- [ ] Variables `.env` régénérées et sécurisées
- [ ] `.env` ajouté à `.gitignore`
- [ ] Historique Git nettoyé
- [ ] Supabase Row Level Security (RLS) activé
- [ ] CORS configuré correctement
- [ ] HTTPS activé en production
- [ ] Rate limiting activé (protection contre brute force)
- [ ] Logs d'audit en place

---

## 📝 Règles Row Level Security (Supabase)

Vérifier que ces policies sont en place :

```sql
-- Users ne peuvent voir que leurs propres données
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (role = 'admin');

-- Utilisateurs ne peuvent modifier que leurs propres données
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

## 🚀 En Production

1. **Utilisez un service de secrets** (Vercel, GitHub Secrets, AWS Secrets Manager)
2. **Activez HSTS** (HTTP Strict Transport Security)
3. **Configurez CSP** (Content Security Policy)
4. **Activez 2FA** pour les admins Discord
5. **Mettez en place des logs** d'accès pour les données sensibles
6. **Testez régulièrement** la sécurité

---

## 📞 En cas de Violation de Sécurité

1. Arrêtez immédiatement le service
2. Régénérez TOUTES les clés/secrets
3. Vérifiez les logs d'accès
4. Notifiez tous les utilisateurs affectés
5. Faites un audit complet

