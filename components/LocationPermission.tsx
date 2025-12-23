import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LocationPermissionProps {
  userId: string;
  onLocationGranted: () => void;
}

const LocationPermission: React.FC<LocationPermissionProps> = ({ userId, onLocationGranted }) => {
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-request location on component mount to show browser permission dialog
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    // Silently request location to trigger browser permission dialog
    navigator.geolocation.getCurrentPosition(
      () => {}, // Success - do nothing
      () => {}, // Error - do nothing
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

  const handleAuthorizeLocation = () => {
    setLoading(true);

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      handleClose();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        // Validate coordinates are within valid ranges
        if (!isValidCoordinates(latitude, longitude)) {
          console.error('Invalid coordinates received');
          handleClose();
          return;
        }

        try {
          // Silently save location to database without showing it to user
          const { error } = await supabase
            .from('profiles')
            .update({ latitude, longitude })
            .eq('id', userId);

          if (error) {
            alert('Erreur lors de l\'enregistrement de la localisation : ' + error.message);
            console.error('Erreur Supabase:', error);
          } else {
            console.log('Location saved successfully');
          }
        } catch (err) {
          console.error('Error saving location:', err);
        }

        // Close notification and continue
        handleClose();
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Even if user denies, close and continue
        handleClose();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Validate coordinates are real GPS coordinates
  const isValidCoordinates = (lat: number, lon: number): boolean => {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180 &&
      !isNaN(lat) &&
      !isNaN(lon)
    );
  };

  const handleClose = async () => {
    setIsVisible(false);
    setLoading(false);
    // Mark in localStorage that user refused location
    localStorage.setItem(`geo-notification-refused-${userId}`, 'true');
    // Set location to NULL in database to mark as refused
    try {
      await supabase
        .from('profiles')
        .update({ latitude: null, longitude: null })
        .eq('id', userId);
    } catch (err) {
      console.error('Error updating location to null:', err);
    }
    // Wait for animation then call callback
    setTimeout(() => onLocationGranted(), 300);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="bg-luxury-dark border border-luxury-gold/30 rounded-2xl p-8 max-w-sm w-full text-center glass relative"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} className="text-gray-400 hover:text-white" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
          <MapPin size={32} />
        </div>

        {/* Title */}
        <h2 className="font-cinzel text-2xl font-bold mb-3 uppercase tracking-widest text-white">
          Localisation requise
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-2 leading-relaxed">
          Pour continuer, nous avons besoin d'accéder à votre position exacte.
        </p>
        <p className="text-gray-500 text-xs mb-8">
          Cette information restera privée et ne sera visible que par les administrateurs.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-semibold text-sm uppercase tracking-wider"
          >
            Fermer
          </button>
          <button
            onClick={handleAuthorizeLocation}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all disabled:opacity-50 font-bold text-sm uppercase tracking-wider"
          >
            {loading ? '⏳ Autorisation...' : '✓ Autoriser'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LocationPermission;
