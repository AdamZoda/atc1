import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface MusicContextType {
  musicUrl: string | null;
  musicName: string;
  isPlaying: boolean;
  volume: number;
  togglePlayPause: () => Promise<void>;
  updateVolume: (volume: number) => Promise<void>;
  updateMusicUrl: (url: string, name: string) => void;
  syncMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicName, setMusicName] = useState('Musique du Serveur');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(20);

  // Charger la musique depuis la base de données au démarrage UNIQUEMENT
  useEffect(() => {
    fetchMusic();
    
    // S'abonner aux changements en temps réel
    const subscription = supabase
      .channel('site_music_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'site_music' },
        (payload) => {
          console.log('🔄 Changement de musique détecté:', payload);
          fetchMusic();
        }
      )
      .subscribe();

    // ✅ SUPPRIMÉ: Le refresh toutes les 5 secondes qui causait les duplications
    // Plus de setInterval qui recharge constamment la musique!

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('site_music')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data[0]) {
        console.log('🎵 Données musique chargées:', {
          url: data[0].music_url,
          name: data[0].music_name,
          isPlaying: data[0].is_playing,
          volume: data[0].volume
        });
        
        // ⚠️ VALIDATION STRICTE: ACCEPTER UNIQUEMENT Supabase Storage
        // Bloquer soundhelix, youtube, spotify, et TOUTE URL externe
        let validUrl: string | null = null;
        
        if (data[0].music_url && typeof data[0].music_url === 'string') {
          // Vérifier que c'est une URL Supabase Storage
          if (data[0].music_url.includes('supabase.co') && 
              data[0].music_url.includes('/storage/') &&
              data[0].music_url.includes('public/music/')) {
            validUrl = data[0].music_url;
            console.log('✅ URL Supabase acceptée');
          } else {
            console.warn('❌ URL BLOQUÉE (non-Supabase):', data[0].music_url);
          }
        }
        
        setMusicUrl(validUrl);
        setMusicName(data[0].music_name);
        setIsPlaying(data[0].is_playing);
        setVolume(data[0].volume);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement musique:', error);
    }
  };

  const syncMusic = () => {
    fetchMusic();
  };

  const togglePlayPause = async () => {
    try {
      const newPlayState = !isPlaying;
      const { error } = await supabase
        .from('site_music')
        .update({ is_playing: newPlayState })
        .neq('id', '');

      if (error) throw error;
      await fetchMusic();
      console.log(`🎵 Musique ${newPlayState ? 'en lecture' : 'en pause'}`);
    } catch (error: any) {
      console.error('❌ Erreur toggle play/pause:', error);
    }
  };

  const updateVolume = async (newVolume: number) => {
    try {
      const { error } = await supabase
        .from('site_music')
        .update({ volume: newVolume })
        .neq('id', '');

      if (error) throw error;
      setVolume(newVolume);
      console.log(`🔊 Volume: ${newVolume}%`);
    } catch (error: any) {
      console.error('❌ Erreur mise à jour volume:', error);
    }
  };

  const updateMusicUrl = async (url: string, name: string) => {
    try {
      const { error } = await supabase
        .from('site_music')
        .update({ music_url: url, music_name: name })
        .neq('id', '');

      if (error) throw error;
      await fetchMusic();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour musique:', error);
    }
  };

  return (
    <MusicContext.Provider value={{
      musicUrl,
      musicName,
      isPlaying,
      volume,
      togglePlayPause,
      updateVolume,
      updateMusicUrl,
      syncMusic
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
