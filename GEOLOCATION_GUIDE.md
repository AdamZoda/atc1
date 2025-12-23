# 📍 Géolocalisation - Guide d'utilisation

## Vue d'ensemble

La fonctionnalité de géolocalisation permet aux utilisateurs de partager leur position GPS avec les administrateurs du serveur. Les coordonnées sont capturées avec précision et peuvent être visualisées directement sur Google Maps.

## Fonctionnalités

### 1. **Demande de localisation automatique**
Lors de la connexion, les utilisateurs sont invités à autoriser le site à accéder à leur position GPS. Deux composants gèrent cela :

- **`LocationPermission.tsx`** : Demande sophistiquée avec interface animée
- **`GeolocationPrompt.tsx`** : Demande simple et directe

### 2. **Page de Profil Utilisateur**
Dans la page profil (`/profile`), les utilisateurs peuvent :
- Voir leur position actuelle avec les coordonnées précises
- Cliquer sur le lien pour voir leur position sur Google Maps
- Mettre à jour leur position en temps réel

### 3. **Admin Panel Amélioré**
Les administrateurs peuvent :
- Voir la liste complète des utilisateurs avec leurs positions
- Cliquer sur les coordonnées pour ouvrir la localisation sur Google Maps
- Utiliser le composant `UserLocationTracker` pour un aperçu en temps réel

### 4. **Composants Réutilisables**

#### `LocationDisplay.tsx`
Composant simple pour afficher les coordonnées avec lien Google Maps :

```tsx
import LocationDisplay from './components/LocationDisplay';

<LocationDisplay 
  latitude={user.latitude}
  longitude={user.longitude}
  showIcon={true}
  linkClassName="text-luxury-gold hover:text-luxury-goldLight"
/>
```

#### `UserLocationTracker.tsx`
Widget pour les administrateurs affichant tous les utilisateurs localisés :

```tsx
import UserLocationTracker from './components/UserLocationTracker';

<UserLocationTracker isAdmin={user.role === 'admin'} />
```

## Utilitaires

### `utils/geolocationUtils.ts`

Fonctions pratiques pour gérer la géolocalisation :

```typescript
// Générer une URL Google Maps
const url = generateGoogleMapsUrl(31.630000, -7.990000);

// Demander la position de l'utilisateur
const coords = await requestUserLocation();

// Valider les coordonnées
if (isValidCoordinates(lat, lon)) { ... }

// Formater les coordonnées
const formatted = formatCoordinates(31.630000, -7.990000, 6);

// Calculer la distance entre deux points
const km = calculateDistance(lat1, lon1, lat2, lon2);
```

## Flux de données

```
Utilisateur → Navigator.geolocation → Coordonnées GPS
            ↓
         Validation
            ↓
         Supabase (profiles table)
            ↓
    Admin Panel / Profile Page
            ↓
       Google Maps Link
```

## Sécurité

- Les données de localisation sont stockées de manière sécurisée dans Supabase
- Seuls les administrateurs peuvent voir les positions des utilisateurs (via l'Admin Panel)
- Les utilisateurs eux-mêmes ne voient que leur propre position
- Les coordonnées sont toujours validées avant d'être sauvegardées

## Permissions du Navigateur

Le navigateur demande la permission à l'utilisateur avant d'accéder à la géolocalisation. Cette permission peut être :
- **Accordée** : Les coordonnées sont capturées
- **Refusée** : L'utilisateur peut continuer sans partager sa position
- **Révoquée** : L'utilisateur peut modifier les permissions dans les paramètres du navigateur

## Navigation GPS

Les utilisateurs sont localisés sur une carte Google Maps :

```
https://www.google.com/maps?q=31.630000,-7.990000
```

Cette URL ouvre une recherche Google Maps centrée sur les coordonnées fournies.

## Dépannage

**Le composant ne s'affiche pas ?**
- Vérifiez que le composant importe bien `LocationDisplay`
- Assurez-vous que les propriétés `latitude` et `longitude` sont passées correctement

**La position n'est pas sauvegardée ?**
- Vérifiez que l'utilisateur a accordé la permission de géolocalisation
- Vérifiez les logs de la console pour les erreurs Supabase
- Assurez-vous que le user.id est correctement passé

**Le lien Google Maps ne fonctionne pas ?**
- Vérifiez que les coordonnées sont valides (lat: -90 à 90, lon: -180 à 180)
- Testez le lien directement dans le navigateur

## Structure de la base de données

La table `profiles` contient les colonnes :
- `latitude` (number) : Latitude du GPS
- `longitude` (number) : Longitude du GPS

Ces colonnes sont nullable pour les utilisateurs qui n'ont pas partagé leur position.

## Exemples

### Exemple 1 : Afficher la position dans un composant personnalisé

```tsx
import { generateGoogleMapsUrl } from './utils/geolocationUtils';

const MyComponent = ({ user }) => {
  if (!user.latitude || !user.longitude) return <span>Position inconnue</span>;
  
  const mapsUrl = generateGoogleMapsUrl(user.latitude, user.longitude);
  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
      Voir sur la carte
    </a>
  );
};
```

### Exemple 2 : Demander la position dans un composant

```tsx
import { requestUserLocation } from './utils/geolocationUtils';

const handleLocate = async () => {
  try {
    const coords = await requestUserLocation();
    console.log(`Position: ${coords.latitude}, ${coords.longitude}`);
    // Sauvegarder dans la base de données
  } catch (error) {
    console.error(error.message);
  }
};
```

## Support

Pour toute question ou problème avec la géolocalisation, consultez la documentation du navigateur ou les logs de la console pour plus de détails sur les erreurs.
