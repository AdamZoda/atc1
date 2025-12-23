import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Navigation, Upload, X } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatar_url, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const DEFAULT_AVATAR = 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg';
  const AVATARS_BUCKET = import.meta.env.VITE_AVATARS_BUCKET || 'avatars';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const user = (data as any)?.user;
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
          setUsername(profileData.username || '');
          setAvatarUrl(profileData.avatar_url || '');
          setAvatarPreview(profileData.avatar_url || '');
          setLatitude(profileData.latitude || null);
          setLongitude(profileData.longitude || null);
        }
      } catch (e) {
        console.error('Could not load profile', e);
        setMessage('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getUser();
      const user = (data as any)?.user;
      if (!user) return;

      const payload: any = { id: user.id, username };
      if (avatar_url) payload.avatar_url = avatar_url;

      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;

      setMessage('Profil mis à jour');
      // Force a refresh so App re-fetches the updated profile
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      console.error('Save error', e);
      setMessage('Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  const handleRequestLocation = async () => {
    setRequestingLocation(true);
    setMessage(null);
    
    if (!navigator.geolocation) {
      setMessage('Géolocalisation non supportée par votre navigateur');
      setRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const { data } = await supabase.auth.getUser();
          const user = (data as any)?.user;
          if (!user) throw new Error('Non authentifié');

          const { error } = await supabase
            .from('profiles')
            .update({ latitude: lat, longitude: lon })
            .eq('id', user.id);

          if (error) throw error;

          setLatitude(lat);
          setLongitude(lon);
          setMessage('✓ Position capturée et sauvegardée');
        } catch (err: any) {
          console.error('Error saving location:', err);
          setMessage('Erreur lors de la sauvegarde de la position');
        } finally {
          setRequestingLocation(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setMessage('Impossible d\'accéder à votre position. Vérifiez les permissions.');
        setShowLocationHelp(true);
        setRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = (data as any)?.user;
      if (!user) throw new Error('Not authenticated');

      const fileExt = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '');
      const filePath = `${AVATARS_BUCKET}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // getPublicUrl is synchronous in Supabase client; destructure safely
      const publicRes = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
      const publicUrl = (publicRes as any)?.data?.publicUrl || (publicRes as any)?.publicUrl || '';
      if (!publicUrl) throw new Error('No public URL returned (check bucket public settings)');

      setAvatarUrl(publicUrl);
      setMessage('✓ Avatar mis à jour avec succès');
      
      // Auto-save the avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      // Refresh user profile data
      const { data: refreshedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (refreshedProfile) {
        setAvatarUrl(refreshedProfile.avatar_url || '');
        setAvatarPreview(refreshedProfile.avatar_url || '');
      }
    } catch (err: any) {
      console.error('Upload error', err);
      setMessage('Erreur lors de l\'upload: ' + (err.message || err.toString()));
      setAvatarPreview(avatar_url); // Reset to previous
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-luxury-dark">
        <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-dark pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="font-cinzel text-4xl font-black text-white mb-2">Mon Profil</h1>
          <p className="text-gray-400">Gérez vos paramètres et votre position en jeu</p>
        </header>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.includes('✓') 
              ? 'bg-green-500/10 border-green-500/30 text-green-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
        {/* Avatar Section */}
        <div className="mb-8 pb-8 border-b border-white/10">
          <h2 className="text-lg font-cinzel font-bold text-white mb-6">Avatar</h2>
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <img 
                src={avatarPreview || avatar_url || DEFAULT_AVATAR} 
                alt="avatar" 
                className="w-32 h-32 rounded-full object-cover border-4 border-luxury-gold shadow-lg"
              />
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all text-sm font-bold uppercase tracking-widest disabled:opacity-50 mb-3"
              >
                <Upload size={18} />
                {uploading ? 'Téléchargement...' : 'Changer d\'avatar'}
              </button>
              <p className="text-xs text-gray-400">
                JPG, PNG ou GIF • Max 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Username Section */}
        <div className="mb-8 pb-8 border-b border-white/10">
          <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-widest">Nom affiché</label>
          <input
            className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white focus:border-luxury-gold focus:outline-none transition-all mb-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Votre nom public (ex: JohnDoe)"
          />
          <p className="text-xs text-gray-400">Ce nom sera visible pour les autres joueurs</p>
        </div>

        {/* Géolocalisation section */}
        <div className="mb-8 p-6 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={20} className="text-luxury-gold" />
            <h2 className="text-lg font-cinzel font-bold text-white">Ma Position</h2>
          </div>
          
          {latitude && longitude ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">✓ Votre position a été enregistrée avec succès</p>
              <button
                onClick={handleRequestLocation}
                disabled={requestingLocation}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm font-semibold disabled:opacity-50"
              >
                <Navigation size={16} />
                {requestingLocation ? 'Localisation en cours...' : 'Mettre à jour ma position'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">Partagez votre position pour que les administrateurs puissent vous localiser dans le jeu</p>
              <button
                onClick={handleRequestLocation}
                disabled={requestingLocation}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all text-sm font-bold uppercase tracking-widest disabled:opacity-50"
              >
                <Navigation size={16} />
                {requestingLocation ? 'Localisation en cours...' : 'Partager ma position'}
              </button>
              <p className="text-xs text-gray-500 text-center">Cela permettra aux admins de vous localiser en jeu</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 rounded-lg bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold uppercase tracking-widest text-sm"
          >
            Sauvegarder
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold uppercase tracking-widest text-sm"
          >
            Annuler
          </button>
        </div>

        {/* Location Help Notification */}
        {showLocationHelp && (
          <div className="fixed bottom-6 right-6 max-w-sm bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-sm text-white shadow-lg">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-luxury-gold mb-2">Comment activer la géolocalisation ?</h3>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li><strong>Chrome/Edge:</strong> Cliquez sur le 🔒 • Géolocalisation • Toujours autoriser</li>
                  <li><strong>Firefox:</strong> Cliquez sur le 🔒 • Permissions • Géolocalisation ✓</li>
                  <li><strong>Safari:</strong> Préférences • Confidentialité • Localisation • Autoriser</li>
                </ul>
              </div>
              <button
                onClick={() => setShowLocationHelp(false)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
