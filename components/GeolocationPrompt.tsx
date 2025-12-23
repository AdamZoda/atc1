import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface GeolocationPromptProps {
  userId: string;
  onDone?: () => void;
}

const GeolocationPrompt: React.FC<GeolocationPromptProps> = ({ userId, onDone }) => {
  const [showPrompt, setShowPrompt] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user already has location stored
    const checkLocation = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', userId)
        .single();

      if (data?.latitude && data?.longitude) {
        setShowPrompt(false);
      }
    };

    checkLocation();
  }, [userId]);

  const handleAllow = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          await supabase
            .from('profiles')
            .update({ latitude: lat, longitude: lon })
            .eq('id', userId);
          
          console.log('Location saved:', { lat, lon });
          setShowPrompt(false);
        } catch (err) {
          console.error('Error saving location:', err);
        } finally {
          setLoading(false);
          if (onDone) onDone();
        }
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message);
        setLoading(false);
        setShowPrompt(false);
        if (onDone) onDone();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleDeny = () => {
    setShowPrompt(false);
    if (onDone) onDone();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4">
      <div className="bg-luxury-dark border border-luxury-gold/20 rounded-2xl p-8 max-w-sm text-center glass">
        <h3 className="text-xl font-cinzel font-bold text-white mb-4">📍 Localisation</h3>
        <p className="text-gray-300 text-sm mb-6">
          Atlantic RP souhaite accéder à votre localisation pour améliorer votre expérience. Cette information est sécurisée et accessible uniquement aux administrateurs.
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleDeny}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 font-bold"
          >
            Refuser
          </button>
          <button
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all disabled:opacity-50 font-bold"
          >
            {loading ? 'Traitement...' : 'Autoriser'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeolocationPrompt;
