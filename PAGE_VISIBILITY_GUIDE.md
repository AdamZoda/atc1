# ✨ Configuration de la Visibilité des Pages (Page Visibility System)

## Qu'est-ce que c'est?

Un système qui permet à l'admin de **masquer ou afficher les pages** du site en temps réel. Quand une page est masquée:
- Elle disparaît du menu de navigation
- Si un utilisateur essaie d'accéder à l'URL directement (ex: `/shop`), il reçoit un message **"🔒 INACCESSIBLE"**
- Les admins voient toujours les pages (même masquées)

## 🔧 Setup (3 étapes)

### ÉTAPE 1: Exécuter le SQL dans Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez à **SQL Editor**
4. Créez une nouvelle query
5. Copiez-collez le contenu de `pages-visibility-setup.sql` de votre projet
6. Cliquez **Run**

✅ Cela créera:
- Table `page_visibility` avec 7 pages (Home, Features, Rules, Community, Game, Shop, Gallery)
- RLS policies (tout le monde peut lire, seul admin peut modifier)
- Valeurs par défaut (toutes les pages visibles)

### ÉTAPE 2: Activer Realtime (optionnel mais recommandé)

Pour que les changements soient **instantanés** sur tous les clients:

1. Dans Supabase Dashboard, allez à **Database → Replication**
2. Cherchez la table `page_visibility`
3. Cliquez le toggle pour l'activer

Sans cela, les utilisateurs doivent recharger la page pour voir les changements.

### ÉTAPE 3: Utiliser le Panel Admin

1. Connectez-vous en tant qu'admin
2. Allez sur `/admin`
3. Cliquez l'onglet **CONFIG**
4. Vous verrez la section **"Visibilité des Pages"** avec 7 boutons
5. Cliquez sur un bouton pour basculer la visibilité (Visible ↔ Caché)

Les changements sont appliqués **instantanément**!

## 🎮 Comportement

**Page Visible:**
- ✅ Bouton visible dans le navbar (desktop et mobile)
- ✅ Utilisateurs peuvent accéder via URL
- ✅ Admins voient le page même si elle est cachée

**Page Cachée:**
- ❌ Bouton DISPARU du navbar
- ❌ Si quelqu'un tape l'URL directement, il voit: **"🔒 INACCESSIBLE - Cette page est actuellement privée"**
- ✅ Admins voient toujours les pages (même cachées)

## 📱 Exemple d'Utilisation

Vous voulez préparer le Shop avant son lancement:

1. Allez à Admin → CONFIG
2. Cliquez sur **"🛍️ SHOP"** pour le masquer
3. Shop disparaît du menu
4. Si quelqu'un essaie `/shop`, il reçoit le message d'inaccessibilité
5. Quand vous êtes prêt, recliquez sur SHOP pour le rendre visible
6. ✅ Tout le monde voit maintenant le Shop!

## 🔐 Sécurité

- RLS policies garantissent que **seul un admin** peut changer la visibilité
- Les utilisateurs normaux ne peuvent que **lire** la table
- Le système protège les pages aussi bien au niveau du code qu'au niveau de la base de données

## 🎨 Pages Disponibles

- 🏠 **Home** - Page d'accueil
- ✨ **Features** - Systèmes exclusifs
- 📋 **Rules** - Règles du serveur
- 👥 **Community** - Réseaux sociaux
- 🎮 **Game** - Page Jeu/Roulette
- 🛍️ **Shop** - Boutique (même système que avant avec broadcast)
- 🎨 **Gallery** - Galerie de posts/media

## 🚀 Prochaines Étapes

Si vous voulez ajouter d'autres pages à ce système, créez simplement une nouvelle ligne dans la table `page_visibility` avec:
```
id: 'page-example'
page_name: 'Example'
is_visible: true
```

Puis dans le Admin panel, ajoutez le mapping au dictionnaire dans la section Page Visibility.

---

**Questions?** Vérifiez la table `page_visibility` dans Supabase si les changements ne s'appliquent pas. Assurez-vous que Realtime est activé pour les changements instantanés.
