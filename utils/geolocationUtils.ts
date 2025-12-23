/**
 * Utilitaires pour la gestion de la géolocalisation
 */

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Génère une URL Google Maps à partir de coordonnées
 * @param latitude - La latitude
 * @param longitude - La longitude
 * @returns L'URL Google Maps
 */
export const generateGoogleMapsUrl = (latitude: number, longitude: number): string => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

/**
 * Demande la position actuelle de l'utilisateur
 * @returns Une promesse avec les coordonnées
 */
export const requestUserLocation = (): Promise<GeolocationCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée par votre navigateur'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = 'Erreur lors de la géolocalisation';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Accès à la position refusé. Vérifiez les permissions de votre navigateur.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Le délai d\'attente pour la géolocalisation a expiré.';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Valide que les coordonnées sont valides
 * @param latitude - La latitude
 * @param longitude - La longitude
 * @returns True si les coordonnées sont valides
 */
export const isValidCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Formate les coordonnées pour l'affichage
 * @param latitude - La latitude
 * @param longitude - La longitude
 * @param precision - Nombre de décimales (défaut: 6)
 * @returns Les coordonnées formatées
 */
export const formatCoordinates = (latitude: number, longitude: number, precision: number = 6): string => {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
};

/**
 * Calcule la distance entre deux coordonnées en kilomètres
 * @param lat1 - Latitude du point 1
 * @param lon1 - Longitude du point 1
 * @param lat2 - Latitude du point 2
 * @param lon2 - Longitude du point 2
 * @returns La distance en kilomètres
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
