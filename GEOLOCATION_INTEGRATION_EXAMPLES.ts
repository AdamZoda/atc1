/**
 * INTEGRATION GUIDE - Système de Géolocalisation
 * 
 * Ce fichier montre comment intégrer la géolocalisation dans votre application
 */

/**
 * 1. UTILISER LocationDisplay POUR AFFICHER LES POSITIONS
 */
import LocationDisplay from '@/components/LocationDisplay';

export const ExampleLocationDisplay = () => {
  const user = { latitude: 31.630000, longitude: -7.990000 };

  return (
    <div className="p-4">
      <h2>Position de l'utilisateur</h2>
      <LocationDisplay
        latitude={user.latitude}
        longitude={user.longitude}
        showIcon={true}
        linkClassName="text-luxury-gold hover:text-luxury-goldLight underline"
      />
    </div>
  );
};

/**
 * 2. UTILISER UserLocationTracker POUR LES ADMINISTRATEURS
 */
import UserLocationTracker from '@/components/UserLocationTracker';

export const AdminDashboard = ({ userRole }: { userRole: string }) => {
  return (
    <div className="space-y-6">
      <h1>Tableau de bord Admin</h1>
      <UserLocationTracker isAdmin={userRole === 'admin'} />
    </div>
  );
};

/**
 * 3. UTILISER LES UTILITAIRES POUR CUSTOM IMPLEMENTATIONS
 */
import {
  generateGoogleMapsUrl,
  requestUserLocation,
  isValidCoordinates,
  formatCoordinates,
  calculateDistance,
} from '@/utils/geolocationUtils';

export const CustomLocationComponent = async () => {
  try {
    // Demander la position
    const coords = await requestUserLocation();

    // Valider les coordonnées
    if (!isValidCoordinates(coords.latitude, coords.longitude)) {
      console.error('Coordonnées invalides');
      return;
    }

    // Formater pour l'affichage
    const formatted = formatCoordinates(
      coords.latitude,
      coords.longitude,
      4
    );

    // Générer lien Google Maps
    const mapsUrl = generateGoogleMapsUrl(
      coords.latitude,
      coords.longitude
    );

    console.log(`Position formatée: ${formatted}`);
    console.log(`Lien Maps: ${mapsUrl}`);

    // Calculer distance depuis un point (ex: siège du serveur)
    const distanceToBase = calculateDistance(
      coords.latitude,
      coords.longitude,
      31.63, // Latitude du siège
      -7.99  // Longitude du siège
    );

    console.log(`Distance au siège: ${distanceToBase.toFixed(2)} km`);
  } catch (error) {
    console.error(error);
  }
};

/**
 * 4. INTÉGRER DANS LA PAGE PROFIL
 * 
 * Déjà implémenté dans pages/Profile.tsx
 * La page permet aux utilisateurs de :
 * - Voir leur position actuelle
 * - Cliquer pour ouvrir sur Google Maps
 * - Mettre à jour leur position
 */

/**
 * 5. INTÉGRER DANS LE PANNEAU ADMIN
 * 
 * Déjà implémenté dans pages/Admin.tsx
 * Les administrateurs peuvent :
 * - Voir tous les utilisateurs avec positions
 * - Cliquer sur les coordonnées pour Google Maps
 * - Avoir un aperçu en temps réel (UserLocationTracker)
 */

/**
 * 6. EXEMPLE COMPLET : SYSTÈME DE ZONE
 * 
 * Vous pouvez créer des zones de jeu et vérifier
 * si un joueur est dans une zone spécifique
 */
import { supabase } from '@/supabaseClient';

interface GameZone {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

const zones: GameZone[] = [
  {
    name: 'Quartier Général',
    latitude: 31.63,
    longitude: -7.99,
    radiusKm: 2,
  },
  {
    name: 'Port Commercial',
    latitude: 31.64,
    longitude: -8.0,
    radiusKm: 1.5,
  },
];

export const checkPlayerZone = async (userId: string) => {
  // Obtenir la position du joueur
  const { data: player, error } = await supabase
    .from('profiles')
    .select('latitude, longitude')
    .eq('id', userId)
    .single();

  if (error || !player?.latitude || !player?.longitude) {
    console.error('Impossible de récupérer la position');
    return;
  }

  // Vérifier chaque zone
  for (const zone of zones) {
    const distance = calculateDistance(
      player.latitude,
      player.longitude,
      zone.latitude,
      zone.longitude
    );

    if (distance <= zone.radiusKm) {
      console.log(`Le joueur est dans la zone: ${zone.name}`);
      return zone;
    }
  }

  console.log('Le joueur est en dehors de toutes les zones');
  return null;
};

/**
 * 7. EXEMPLE : AFFICHER TOUS LES JOUEURS SUR UNE CARTE
 */
export const MapAllPlayers = async () => {
  const { data: players, error } = await supabase
    .from('profiles')
    .select('id, username, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error || !players) {
    console.error('Erreur lors de la récupération des joueurs');
    return;
  }

  // Construire l'URL Google Maps avec tous les markers
  // Google Maps accepte les paramètres de recherche multiples
  const baseUrl = 'https://www.google.com/maps/search/';
  const markers = players
    .map((p) => `${p.latitude},${p.longitude} (${p.username})`)
    .join('/');

  const mapsUrl = baseUrl + encodeURIComponent(markers);
  console.log('Lien Google Maps avec tous les joueurs:', mapsUrl);

  return mapsUrl;
};

/**
 * 8. EXEMPLE : SYSTÈME DE NOTIFICATION DE PROXIMITÉ
 */
export const notifyNearbyPlayers = async (
  userId: string,
  notificationRadius: number = 5 // km
) => {
  // Obtenir la position du joueur
  const { data: player } = await supabase
    .from('profiles')
    .select('latitude, longitude')
    .eq('id', userId)
    .single();

  if (!player?.latitude || !player?.longitude) return;

  // Récupérer tous les joueurs
  const { data: allPlayers } = await supabase
    .from('profiles')
    .select('id, username, latitude, longitude');

  if (!allPlayers) return;

  // Calculer les distances et notifier
  const nearbyPlayers = allPlayers
    .filter((p) => p.id !== userId && p.latitude && p.longitude)
    .map((p) => ({
      id: p.id,
      username: p.username,
      distance: calculateDistance(
        player.latitude,
        player.longitude,
        p.latitude,
        p.longitude
      ),
    }))
    .filter((p) => p.distance <= notificationRadius)
    .sort((a, b) => a.distance - b.distance);

  console.log(`${nearbyPlayers.length} joueurs à proximité:`);
  nearbyPlayers.forEach((p) => {
    console.log(`  - ${p.username}: ${p.distance.toFixed(2)} km`);
  });

  return nearbyPlayers;
};

/**
 * 9. EXEMPLE : STATS DE LOCALISATION POUR UN ADMIN REPORT
 */
export const getLocationStats = async () => {
  const { data: players, error } = await supabase
    .from('profiles')
    .select('latitude, longitude');

  if (error || !players) {
    console.error('Erreur');
    return;
  }

  const withLocation = players.filter(
    (p) => p.latitude !== null && p.longitude !== null
  );

  console.log(`Stats de localisation:`);
  console.log(`  - Total joueurs: ${players.length}`);
  console.log(`  - Avec localisation: ${withLocation.length}`);
  console.log(`  - Pourcentage: ${((withLocation.length / players.length) * 100).toFixed(1)}%`);
};

/**
 * 10. REMINDERS & BEST PRACTICES
 * 
 * ✓ Toujours valider les coordonnées avant de les utiliser
 * ✓ Respecter les permissions RGPD/confidentialité
 * ✓ Sauvegarder les positions dans la base de données
 * ✓ Mettre en place les liens Google Maps pour une visualisation facile
 * ✓ Utiliser calculateDistance pour les mécaniques de gameplay
 * ✓ Rafraîchir les positions régulièrement
 * ✓ Notifier les utilisateurs que leur position est partagée
 */

export default {};
