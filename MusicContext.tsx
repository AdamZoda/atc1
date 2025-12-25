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
  const [isUpdatingLocally, setIsUpdatingLocally] = useState(false); // Flag pour éviter les recharges en conflit

  // Charger la musique depuis la base de données au démarrage UNIQUEMENT
  useEffect(() => {
    fetchMusic();
    
    // Polling simple chaque 5 secondes pour détecter les changements d'URL (pas le play/pause)
    const pollInterval = setInterval(() => {
      if (!isUpdatingLocally) {
        fetchMusicUrlOnly(); // Seulement vérifier l'URL, pas le play/pause
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isUpdatingLocally]);

  const fetchMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('site_music')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data[0]) {
        // ⚠️ VALIDATION STRICTE: ACCEPTER UNIQUEMENT Supabase Storage
        let validUrl: string | null = null;
        
        if (data[0].music_url && typeof data[0].music_url === 'string') {
          if (data[0].music_url.includes('supabase.co') && 
              data[0].music_url.includes('/storage/') &&
              data[0].music_url.includes('public/music/')) {
            validUrl = data[0].music_url;
          } else {
            console.warn('⚠️ URL non-Supabase bloquée');
          }
        }
        
        setMusicUrl(validUrl);
        setMusicName(data[0].music_name);
        setIsPlaying(data[0].is_playing);
        setVolume(data[0].volume);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement musique');
    }
  };

  // Charger SEULEMENT l'URL et le nom (pas le play/pause)
  const fetchMusicUrlOnly = async () => {
    try {
      const { data, error } = await supabase
        .from('site_music')
        .select('music_url, music_name')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data[0]) {
        let validUrl: string | null = null;
        
        if (data[0].music_url && typeof data[0].music_url === 'string') {
          if (data[0].music_url.includes('supabase.co') && 
              data[0].music_url.includes('/storage/') &&
              data[0].music_url.includes('public/music/')) {
            validUrl = data[0].music_url;
          }
        }
        
        setMusicUrl(validUrl);
        setMusicName(data[0].music_name);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement URL musique');
    }
  };

  const syncMusic = () => {
    fetchMusic();
  };

  const togglePlayPause = async () => {
    try {
      // ✅ OPTIMISME: Inverser l'état immédiatement
      const newPlayState = !isPlaying;
      setIsPlaying(newPlayState);
      
      // Flag pour 2 secondes : ignorer tous les recharges de la BD
      setIsUpdatingLocally(true);
      setTimeout(() => setIsUpdatingLocally(false), 2000);

      // Récupérer l'ID du premier enregistrement
      const { data: musicData } = await supabase
        .from('site_music')
        .select('id')
        .limit(1);

      if (!musicData || !musicData[0]) {
        console.log('Aucun enregistrement de musique trouvé');
        setIsPlaying(!newPlayState);
        return;
      }

      const recordId = musicData[0].id;
      const { error } = await supabase
        .from('site_music')
        .update({ is_playing: newPlayState })
        .eq('id', recordId);

      if (error) {
        setIsPlaying(!newPlayState);
        throw error;
      }
    } catch (error: any) {
      console.error('❌ Erreur toggle play/pause');
    }
  };

  const updateVolume = async (newVolume: number) => {
    try {
      // ✅ OPTIMISME: Mettre à jour le volume immédiatement
      setVolume(newVolume);
      
      // Flag pour 2 secondes : ignorer les recharges
      setIsUpdatingLocally(true);
      setTimeout(() => setIsUpdatingLocally(false), 2000);

      // Récupérer l'ID du premier enregistrement
      const { data: musicData } = await supabase
        .from('site_music')
        .select('id')
        .limit(1);

      if (!musicData || !musicData[0]) {
        console.log('Aucun enregistrement de musique trouvé');
        return;
      }

      const recordId = musicData[0].id;
      const { error } = await supabase
        .from('site_music')
        .update({ volume: newVolume })
        .eq('id', recordId);

      if (error) throw error;
    } catch (error: any) {
      console.error('❌ Erreur mise à jour volume');
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
