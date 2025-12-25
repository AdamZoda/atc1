import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, VolumeX, Play, Pause, X } from 'lucide-react';
import { useMusic } from '../MusicContext';

const MusicPlayer: React.FC = () => {
  const { musicUrl, musicName, isPlaying, volume, togglePlayPause, updateVolume } = useMusic();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [localVolume, setLocalVolume] = useState(20);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showPlayerBar, setShowPlayerBar] = useState(true);

  // Mettre à jour la source audio
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Ne charger QUE si c'est une URL valide (pas null/undefined/vide)
    if (!musicUrl || musicUrl.trim() === '') {
      console.log('⚠️ Pas d\'URL musique');
      audioRef.current.src = '';
      return;
    }

    audioRef.current.src = musicUrl;
    audioRef.current.load();
    console.log('🎵 URL audio chargée:', musicUrl);
  }, [musicUrl]);

  // Jouer/Pause automatiquement
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && musicUrl) {
      console.log('▶️ Tentative de lecture...');
      audioRef.current.play()
        .then(() => {
          console.log('✅ Lecture réussie');
          setIsAudioPlaying(true);
        })
        .catch((err: any) => {
          // Common errors:
          // - NotAllowedError: Browser blocks autoplay without user interaction
          // - NotSupportedError: Audio format not supported
          // - AbortError: Playback was aborted
          if (err.name === 'NotAllowedError') {
            console.warn('⚠️ Autoplay bloqué - Cliquez sur le lecteur pour lancer la musique');
          } else {
            console.error('❌ Erreur lecture:', err.message || err);
          }
        });
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, [isPlaying, musicUrl]);

  // Mettre à jour le volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = localVolume / 100;
    }
  }, [localVolume]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    // Contrôle IMMÉDIAT de l'audio HTML
    if (audioRef.current.paused) {
      audioRef.current.play()
        .then(() => setIsAudioPlaying(true))
        .catch((err) => console.error('Erreur play:', err));
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
    
    // Synchronise aussi avec la BD pour les autres utilisateurs
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
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between gap-6">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: isAudioPlaying ? 360 : 0 }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                      className="flex-shrink-0"
                    >
                      <Music size={24} className={isAudioPlaying ? "text-luxury-gold" : "text-gray-400"} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 uppercase tracking-widest">🎵 Musique du Serveur</p>
                      <p className="text-white font-bold truncate">{musicName || 'Musique du Serveur'}</p>
                      <p className="text-xs text-gray-500">{isAudioPlaying ? '▶️ En cours de lecture' : '⏸️ En pause'}</p>
                    </div>
                  </div>
                </div>

                {/* Contrôles */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Play/Pause */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePlayPause}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                    title={isAudioPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isAudioPlaying ? (
                      <Pause size={20} className="text-luxury-gold" />
                    ) : (
                      <Play size={20} className="text-luxury-gold" />
                    )}
                  </motion.button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 w-40 hidden md:flex">
                    <VolumeX size={16} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={localVolume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-luxury-gold"
                    />
                    <Volume2 size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-luxury-gold w-8 text-right">
                      {localVolume}%
                    </span>
                  </div>

                  {/* Volume Control Mobile */}
                  <div className="flex md:hidden items-center gap-1">
                    <VolumeX size={14} className="text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={localVolume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-luxury-gold"
                    />
                    <Volume2 size={14} className="text-gray-400" />
                  </div>

                  {/* Stop */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStop}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                    title="Arrêter"
                  >
                    <X size={20} className="text-red-400" />
                  </motion.button>

                  {/* Fermer la barre */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPlayerBar(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all hidden sm:block"
                    title="Fermer"
                  >
                    <X size={20} className="text-gray-400" />
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
            className="fixed bottom-6 left-6 z-40 w-14 h-14 bg-gradient-to-br from-luxury-gold/80 to-luxury-gold/60 border-2 border-luxury-gold rounded-full flex items-center justify-center text-black hover:from-luxury-gold hover:to-luxury-gold transition-all shadow-lg"
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
