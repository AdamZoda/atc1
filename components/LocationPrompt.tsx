import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationPromptProps {
  onLocationGranted?: (lat: number, lon: number) => void;
  onLocationDenied?: () => void;
}

const LocationPrompt: React.FC<LocationPromptProps> = ({ onLocationGranted, onLocationDenied }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`Location: ${latitude}, ${longitude}`);
        setLoading(false);
        onLocationGranted?.(latitude, longitude);
      },
      (err) => {
        let msg = 'Erreur lors de la récupération de la localisation';
        if (err.code === 1) msg = 'Permission refusée. Veuillez autoriser la localisation dans les paramètres de votre navigateur.';
        if (err.code === 2) msg = 'Position indisponible. Vérifiez votre connexion GPS.';
        if (err.code === 3) msg = 'Délai dépassé. Veuillez réessayer.';
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleDeny = () => {
    setError('Vous devez autoriser la localisation pour accéder au site.');
    onLocationDenied?.();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="max-w-md w-full glass rounded-3xl p-8 border border-white/10 text-center">
        <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
          <MapPin size={32} />
        </div>
        
        <h2 className="font-cinzel text-2xl font-black mb-2 uppercase tracking-widest text-white">
          Localisation
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Nous avons besoin de votre localisation exacte pour accéder au site. 
          Vos coordonnées restent confidentielles et ne seront visibles que par l'administration.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 py-3 bg-luxury-gold text-black font-bold uppercase tracking-widest rounded-lg hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {loading ? 'Recherche...' : 'Accepter'}
          </button>
          <button
            onClick={handleDeny}
            disabled={loading}
            className="flex-1 py-3 bg-white/10 text-white font-bold uppercase tracking-widest rounded-lg border border-white/20 hover:bg-white/20 disabled:opacity-50 transition-all"
          >
            Refuser
          </button>
        </div>

        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-4 leading-relaxed">
          ⚠️ Sans autorisation, vous ne pourrez pas accéder au site.
        </p>
      </div>
    </div>
  );
};

export default LocationPrompt;
