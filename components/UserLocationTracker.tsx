import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import LocationDisplay from './LocationDisplay';
import { Users, MapPin } from 'lucide-react';

interface UserLocationTrackerProps {
  isAdmin: boolean;
}

const UserLocationTracker: React.FC<UserLocationTrackerProps> = ({ isAdmin }) => {
  const [usersWithLocation, setUsersWithLocation] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsersWithLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, latitude, longitude')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (error) throw error;
        setUsersWithLocation(data as Profile[]);
      } catch (err) {
        console.error('Error fetching users with location:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersWithLocation();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUsersWithLocation, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="p-6 glass rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={20} className="text-luxury-gold" />
          <h3 className="text-lg font-cinzel font-bold">Utilisateurs Localisés</h3>
        </div>
        <div className="animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (usersWithLocation.length === 0) {
    return (
      <div className="p-6 glass rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={20} className="text-luxury-gold" />
          <h3 className="text-lg font-cinzel font-bold">Utilisateurs Localisés</h3>
        </div>
        <p className="text-gray-400 text-sm">Aucun utilisateur n'a partagé sa position</p>
      </div>
    );
  }

  return (
    <div className="p-6 glass rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <MapPin size={20} className="text-luxury-gold" />
        <h3 className="text-lg font-cinzel font-bold">{usersWithLocation.length} Utilisateurs Localisés</h3>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {usersWithLocation.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <img
              src={user.avatar_url || 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg'}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <LocationDisplay
                latitude={user.latitude}
                longitude={user.longitude}
                showIcon={false}
                className="text-xs"
                linkClassName="text-luxury-gold/80 hover:text-luxury-gold transition-colors"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserLocationTracker;
