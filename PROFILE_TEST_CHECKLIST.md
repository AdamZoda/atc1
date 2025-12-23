# ✅ Checklist de Test - Optimisations Profile

## 🧪 Tests d'Upload d'Avatar

### Test 1: Upload depuis fichier local
- [ ] Naviguer vers `/profile`
- [ ] Cliquer sur "📤 Changer d'avatar"
- [ ] Sélectionner une image locale
- [ ] **Vérifier:** Preview s'affiche immédiatement
- [ ] **Vérifier:** Loading spinner apparaît
- [ ] **Attendre:** Upload complète
- [ ] **Vérifier:** Message "✓ Avatar mis à jour" apparaît
- [ ] **Vérifier:** Avatar mise à jour dans la page
- [ ] **Recharger la page:** Avatar persist (sauvegardé en DB)

### Test 2: Types de fichiers
- [ ] Tester avec JPG
- [ ] Tester avec PNG
- [ ] Tester avec GIF
- [ ] Tester avec fichier invalide (TXT) → Doit refuser
- [ ] **Vérifier:** Messages d'erreur appropriés

### Test 3: Fichiers de taille limite
- [ ] Petit fichier (< 1MB) → Doit marcher
- [ ] Fichier moyen (2-3MB) → Doit marcher
- [ ] Très gros fichier (> 10MB) → Doit refuser
- [ ] **Vérifier:** Messages d'erreur clairs

---

## 📍 Tests de Géolocalisation

### Test 4: Demander position
- [ ] Cliquer sur "Partager ma position"
- [ ] **Vérifier:** Navigateur demande permission
- [ ] Accepter les permissions
- [ ] **Vérifier:** Message de succès apparaît
- [ ] **Vérifier:** Bouton change en "Mettre à jour ma position"
- [ ] **Vérifier:** Lien "Voir sur Google Maps" apparaît

### Test 5: Voir sur Google Maps
- [ ] Cliquer sur "📍 Voir sur Google Maps"
- [ ] **Vérifier:** S'ouvre dans un nouvel onglet
- [ ] **Vérifier:** Map centrée sur votre position
- [ ] **Vérifier:** Marqueur visible

### Test 6: Refuser position
- [ ] Réinitialiser la position (supprimer de DB)
- [ ] Cliquer sur "Partager ma position"
- [ ] **Refuser** les permissions
- [ ] **Vérifier:** Page reste opérationnelle
- [ ] **Vérifier:** Message "Impossible d'accéder..."

### Test 7: Mettre à jour position
- [ ] Avoir une position enregistrée
- [ ] Aller dans une autre zone (GPS change)
- [ ] Cliquer "Mettre à jour ma position"
- [ ] **Vérifier:** Nouvelles coordonnées sauvegardées
- [ ] Se connecter en admin panel
- [ ] **Vérifier:** Nouvelles coordonnées visibles pour admin

---

## 🔐 Tests de Sécurité

### Test 8: Coordonnées cachées
- [ ] Se connecter comme utilisateur normal
- [ ] Aller sur `/profile`
- [ ] **Vérifier:** Coordonnées GPS **N'APPARAISSENT PAS**
- [ ] **Vérifier:** Seul le lien Google Maps est visible
- [ ] **Vérifier:** Les coordonnées exactes ne sont pas affichées

### Test 9: Admin panel
- [ ] Se connecter comme admin
- [ ] Aller sur `/admin` → Onglet "Utilisateurs"
- [ ] **Vérifier:** Colonne "Localisation" visible
- [ ] **Vérifier:** Coordonnées des utilisateurs affichées
- [ ] **Vérifier:** Lien Google Maps fonctionnel

### Test 10: Data privacy
- [ ] Inspecter le code source (F12 → Network)
- [ ] Uploader avatar
- [ ] **Vérifier:** Pas de données sensibles dans logs
- [ ] **Vérifier:** URLs stockées sur Supabase Storage (publiques)
- [ ] **Vérifier:** Coordonnées en DB (sécurisées)

---

## 🎨 Tests Interface

### Test 11: Design responsive
- [ ] Ouvrir Profile sur Desktop (1920px)
- [ ] **Vérifier:** Avatar grand (128x128px)
- [ ] **Vérifier:** Layout horizontal
- [ ] **Vérifier:** Sections clairement séparées

- [ ] Ouvrir sur Tablet (768px)
- [ ] **Vérifier:** Layout adapté
- [ ] **Vérifier:** Tout reste lisible

- [ ] Ouvrir sur Mobile (375px)
- [ ] **Vérifier:** Avatar centré
- [ ] **Vérifier:** Boutons full-width
- [ ] **Vérifier:** Tout reste accessible

### Test 12: Messages et feedback
- [ ] Upload réussi → Message vert avec ✓
- [ ] Upload échoué → Message rouge avec ✗
- [ ] Position sauvegardée → Message vert
- [ ] Permission refusée → Message d'erreur
- [ ] **Vérifier:** Tous les messages clairs et lisibles

### Test 13: Animations et transitions
- [ ] Cliquer sur bouton avatar → Feedback visuel
- [ ] Hover sur lien Google Maps → Changement couleur
- [ ] Loading spinner → Animation fluide
- [ ] Messages → Apparition/disparition animée

---

## ♿ Tests Accessibilité

### Test 14: Keyboard navigation
- [ ] TAB à travers tous les éléments
- [ ] **Vérifier:** Ordre logique
- [ ] **Vérifier:** Focus visible sur tous les boutons
- [ ] ENTER sur boutons → Déclenche action

### Test 15: Screen reader
- [ ] Utiliser lecteur d'écran (NVDA/JAWS)
- [ ] **Vérifier:** Labels correctement liés aux inputs
- [ ] **Vérifier:** Messages d'erreur annoncés
- [ ] **Vérifier:** Sections structurées (h2, h3, etc.)

---

## 🚀 Tests de Performance

### Test 16: Upload performance
- [ ] Uploader image 3MB
- [ ] Mesurer temps upload (Network tab F12)
- [ ] **Doit être:** < 5 secondes pour 3MB
- [ ] **Vérifier:** UI reste responsive

### Test 17: Page load performance
- [ ] DevTools → Performance tab
- [ ] Charger `/profile`
- [ ] **Vérifier:** LCP (Largest Contentful Paint) < 2.5s
- [ ] **Vérifier:** CLS (Cumulative Layout Shift) < 0.1

---

## 📋 Résumé Final

| Test | Statut | Notes |
|------|--------|-------|
| Avatar upload | ⬜ | |
| File types | ⬜ | |
| Size limits | ⬜ | |
| Geolocation | ⬜ | |
| Google Maps | ⬜ | |
| Security | ⬜ | |
| Admin panel | ⬜ | |
| Responsive | ⬜ | |
| Accessibility | ⬜ | |
| Performance | ⬜ | |

---

## 🐛 Bugs à Reporter

Si vous trouvez des bugs:
1. Description du problème
2. Étapes pour reproduire
3. Résultat attendu
4. Résultat actuel
5. Screenshot si possible

Exemple:
```
Bug: Avatar ne s'affiche pas après upload
Étapes: 1) Aller profile 2) Upload image 3) Recharger page
Attendu: Avatar s'affiche
Actuel: Avatar blanco
```
