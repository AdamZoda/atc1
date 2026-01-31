import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, VolumeX, Play, Pause, X } from 'lucide-react';
import { useMusic } from '../MusicContext';

const MusicPlayer: React.FC = () => {
  const { musicUrl, musicName, isPlaying, volume, togglePlayPause, updateVolume } = useMusic();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [localVolume, setLocalVolume] = useState(20);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showPlayerBar, setShowPlayerBar] = useState(false);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Mettre à jour la source audio UNIQUEMENT quand l'URL change réellement
  useEffect(() => {
    if (!audioRef.current) return;

    // Si l'URL n'a pas changé, ne rien faire
    if (musicUrl === previousUrl) {
      return;
    }

    // Si nouvelle URL
    if (musicUrl && musicUrl.trim() !== '') {
      setIsLoadingUrl(true);

      // Arrêter la musique précédente
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Charger la nouvelle
      audioRef.current.src = musicUrl;
      audioRef.current.load();
      console.log('🎵 Nouvelle URL audio chargée:', musicUrl);

      setPreviousUrl(musicUrl);
      setIsLoadingUrl(false);
    } else {
      // Pas d'URL valide
      audioRef.current.src = '';
      audioRef.current.pause();
      console.log('⚠️ Pas d\'URL musique');
      setPreviousUrl(null);
    }
  }, [musicUrl]);

  // Jouer/Pause automatiquement SANS recharger l'audio
  useEffect(() => {
    if (!audioRef.current || isLoadingUrl) return;

    // Petit délai pour éviter les race conditions
    const playAudio = async () => {
      try {
        if (isPlaying && musicUrl) {
          await audioRef.current!.play();
        } else {
          audioRef.current!.pause();
        }
      } catch (err: any) {
        // Ignorer les erreurs AbortError (réseau, etc)
        if (err.name !== 'AbortError') {
          console.error('❌ Erreur audio:', err);
        }
      }
    };

    playAudio();
  }, [isPlaying, musicUrl, isLoadingUrl]);

  // Mettre à jour le volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = localVolume / 100;
    }
  }, [localVolume]);

  const handlePlayPause = () => {
    // Juste appeler la fonction du contexte
    // L'effet useEffect gérera le play/pause automatiquement
    togglePlayPause();
  };

  const handleVolumeChange = (value: number) => {
    setLocalVolume(value);
    updateVolume(value);
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsAudioPlaying(false);
  };

  if (!musicUrl) return null;

  return (
    <>
      <audio
        ref={audioRef}
        loop
        crossOrigin="anonymous"
        preload="auto"
        onPlay={() => {
          console.log('▶️ Audio en lecture');
          setIsAudioPlaying(true);
        }}
        onPause={() => {
          console.log('⏸️ Audio en pause');
          setIsAudioPlaying(false);
        }}
        onEnded={() => {
          console.log('🔄 Redémarrage boucle');
        }}
        onError={(e) => {
          console.error('❌ Erreur audio:', e);
        }}
      />

      <AnimatePresence>
        {showPlayerBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-luxury-dark via-luxury-dark to-luxury-dark border-t border-luxury-gold/30"
          >
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between gap-6 flex-wrap lg:flex-nowrap">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: isAudioPlaying ? 360 : 0 }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                      className="flex-shrink-0"
                    >
                      <Music size={28} className={isAudioPlaying ? "text-luxury-gold" : "text-gray-400"} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 uppercase tracking-widest">🎵 Musique du Serveur</p>
                      <p className="text-white font-bold truncate text-lg">{musicName || 'Musique du Serveur'}</p>
                      <p className="text-sm text-gray-500">{isAudioPlaying ? '▶️ En cours de lecture' : '⏸️ En pause'}</p>
                    </div>
                  </div>
                </div>

                {/* Séparateur */}
                <div className="hidden lg:block w-px h-12 bg-gradient-to-b from-transparent via-luxury-gold/30 to-transparent"></div>

                {/* Contrôles */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  {/* Play/Pause */}
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePlayPause}
                    className="p-3 hover:bg-white/10 rounded-lg transition-all border-2 border-luxury-gold/40 hover:border-luxury-gold"
                    title={isAudioPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isAudioPlaying ? (
                      <Pause size={24} className="text-luxury-gold" />
                    ) : (
                      <Play size={24} className="text-luxury-gold" />
                    )}
                  </motion.button>

                  {/* Volume Control - Desktop */}
                  <div className="flex items-center gap-3 w-48 hidden lg:flex">
                    <VolumeX size={18} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={localVolume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="flex-1 h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-luxury-gold hover:bg-white/20 transition-all"
                    />
                    <Volume2 size={18} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-luxury-gold w-10 text-center">
                      {localVolume}%
                    </span>
                  </div>

                  {/* Volume Control - Tablet */}
                  <div className="hidden md:flex lg:hidden items-center gap-2">
                    <VolumeX size={16} className="text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={localVolume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="w-32 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-luxury-gold"
                    />
                    <Volume2 size={16} className="text-gray-400" />
                  </div>

                  {/* Volume Control - Mobile */}
                  <div className="flex md:hidden items-center gap-2">
                    <VolumeX size={14} className="text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={localVolume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="w-20 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-luxury-gold"
                    />
                    <Volume2 size={14} className="text-gray-400" />
                  </div>

                  {/* Fermer la barre */}
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPlayerBar(false)}
                    className="p-3 hover:bg-white/10 rounded-lg transition-all border-2 border-gray-400/30 hover:border-gray-400"
                    title="Fermer"
                  >
                    <X size={24} className="text-gray-400" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bouton pour réafficher */}
        {!showPlayerBar && musicUrl && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => setShowPlayerBar(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-luxury-gold/80 to-luxury-gold/60 border-2 border-luxury-gold rounded-full flex items-center justify-center text-black hover:from-luxury-gold hover:to-luxury-gold transition-all shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Afficher le lecteur de musique"
          >
            <Music size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;
