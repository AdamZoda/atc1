import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatar_url, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      setMessage('Avatar uploadé');
    } catch (err: any) {
      console.error('Upload error', err);
      setMessage('Erreur lors de l\'upload: ' + (err.message || err.toString()));
    } finally {
      setUploading(false);
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
    <div className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold text-white mb-6">Mon Profil</h1>

      {message && <div className="mb-4 text-sm text-luxury-gold">{message}</div>}

      <div className="bg-white/5 p-6 rounded-lg">
        <div className="mb-4 flex items-center gap-4">
          <img src={avatar_url || DEFAULT_AVATAR} alt="avatar" className="w-20 h-20 rounded-full object-cover border border-white/10" />
          <div>
            <label className="block text-sm text-gray-300 mb-2">Changer d'avatar</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {uploading && <div className="text-sm text-gray-300 mt-2">Téléchargement...</div>}
          </div>
        </div>
        <label className="block text-sm text-gray-300 mb-2">Nom affiché</label>
        <input
          className="w-full p-3 rounded bg-black/40 border border-white/10 text-white mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Votre nom public (ex: JohnDoe)"
        />

        <label className="block text-sm text-gray-300 mb-2">URL avatar (optionnel)</label>
        <input
          className="w-full p-3 rounded bg-black/40 border border-white/10 text-white mb-4"
          value={avatar_url}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-luxury-gold text-black font-bold"
          >
            Sauvegarder
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-white/5 border border-white/10 text-white"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
