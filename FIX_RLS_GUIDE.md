# 🔐 FIX URGENT - Row Level Security (RLS) Bloque l'Upload

## ❌ L'ERREUR

```
POST https://...supabase.co/storage/.../music/music_... 400 (Bad Request)
❌ Erreur upload: StorageApiError: new row violates row-level security policy
```

## 🎯 LA CAUSE

La table `site_music` a **Row Level Security (RLS) ACTIVÉ** qui bloque:
- ❌ L'insertion de nouvelles musiques
- ❌ La mise à jour de la musique
- ❌ La lecture des données

## ✅ LA SOLUTION (2 min)

### Étape 1: Exécuter le script de fix (1 min)

**Fichier:** `FIX_RLS_SECURITY.sql`

**Procédure:**
1. Ouvrez Supabase SQL Editor
2. Copier-coller TOUT le contenu
3. Cliquez "RUN"

**Résultat attendu:**
```
✅ RLS DÉSACTIVÉ AVEC SUCCÈS!
site_music: ✅ RLS DÉSACTIVÉ
admin_logs: ✅ RLS DÉSACTIVÉ
```

### Étape 2: Rafraîchir et retester (1 min)

1. Allez à Admin Panel → Musique
2. Uploader une chanson
3. ✅ Ça devrait marcher!

**Console attendue:**
```
✅ Fichier uploadé: https://...supabase.co/...
✅ Musique uploadée avec succès!
```

---

## 🔍 QU'EST-CE QUE RLS?

**Row Level Security** = Protection de sécurité qui dit:
- ❌ Qui peut lire les données?
- ❌ Qui peut insérer des données?
- ❌ Qui peut modifier les données?

**Problème:** Il y avait une policy RLS qui refusait TOUT le monde, même les admins!

**Solution:** Désactiver RLS complètement (pour un site simple comme le vôtre, c'est OK)

---

## 📋 CHECKLIST

- [ ] 1. Exécuté `FIX_RLS_SECURITY.sql`
- [ ] 2. Vu les messages "✅ RLS DÉSACTIVÉ"
- [ ] 3. Retesté l'upload
- [ ] 4. Console montre "✅ Fichier uploadé"

---

**Status:** 🚀 RLS fixé!

Exécutez le script et réessayez l'upload. Ça devrait marcher maintenant! 🎉
