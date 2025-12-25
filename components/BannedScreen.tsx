import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface BannedScreenProps {
  onKick?: () => void;
}

const BannedScreen: React.FC<BannedScreenProps> = ({ onKick }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-red-900 flex items-center justify-center overflow-hidden">
      {/* Arrière-plan animé rouge */}
      <motion.div
        className="absolute inset-0 bg-red-600"
        animate={{
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />

      {/* Grille d'erreur */}
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundPosition: ['0px 0px', '40px 40px'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'loop',
        }}
        style={{
          backgroundImage: 'linear-gradient(45deg, rgba(255,0,0,0.1) 25%, transparent 25%, transparent 75%, rgba(255,0,0,0.1) 75%, rgba(255,0,0,0.1)), linear-gradient(45deg, rgba(255,0,0,0.1) 25%, transparent 25%, transparent 75%, rgba(255,0,0,0.1) 75%, rgba(255,0,0,0.1))',
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      />

      {/* Contenu du bannissement */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        {/* Icône d'alerte */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -5, 5, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          className="mb-8 flex justify-center"
        >
          <AlertTriangle size={120} className="text-pink-300 drop-shadow-2xl" />
        </motion.div>

        {/* Message clignote */}
        <motion.h1
          animate={{
            opacity: [1, 0.2, 1],
            textShadow: [
              '0 0 20px rgba(236, 72, 153, 0.8)',
              '0 0 40px rgba(236, 72, 153, 1)',
              '0 0 20px rgba(236, 72, 153, 0.8)',
            ],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          className="text-8xl font-black text-pink-400 mb-6 tracking-wider"
        >
          YOU ARE BANNED
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          className="text-3xl text-pink-300 mb-8 font-bold tracking-wide"
        >
          ACCESS DENIED
        </motion.p>

        {/* Détails */}
        <div className="text-xl text-pink-200 space-y-4 mb-12">
          <p>❌ Vous avez été banni du serveur</p>
          <p>⛔ Vous n'avez pas accès à cette ressource</p>
          <p>📞 Contactez un administrateur pour plus d'informations</p>
        </div>

        {/* Bouton de déconnexion */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (onKick) {
              onKick();
            } else {
              window.location.href = '/';
            }
          }}
          className="px-8 py-4 bg-pink-600 hover:bg-pink-500 text-white font-bold text-lg rounded-lg transition-all border-2 border-pink-400"
        >
          Retourner à l'accueil
        </motion.button>
      </motion.div>

      {/* Particules animées */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-4 h-4 bg-pink-500 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: -20,
            opacity: 0.7,
          }}
          animate={{
            y: window.innerHeight + 20,
            opacity: 0,
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            repeat: Infinity,
            repeatDelay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
};

export default BannedScreen;
