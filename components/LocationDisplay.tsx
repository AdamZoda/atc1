import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationDisplayProps {
  latitude: number | null;
  longitude: number | null;
  showIcon?: boolean;
  className?: string;
  linkClassName?: string;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
  latitude,
  longitude,
  showIcon = true,
  className = "",
  linkClassName = "text-luxury-gold hover:text-luxury-goldLight underline"
}) => {
  if (!latitude || !longitude) {
    return (
      <span className={`text-gray-500 text-xs italic ${className}`}>
        Non disponible
      </span>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className={className}>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 ${linkClassName}`}
      >
        {showIcon && <MapPin size={16} />}
        <span>
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </a>
    </div>
  );
};

export default LocationDisplay;
