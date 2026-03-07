import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dices, CircleDot, Trophy, Sparkles } from 'lucide-react';
import AccessControl from '../components/AccessControl';

const games = [
  {
    id: 'wheel',
    title: 'Roue de la Fortune',
    description: 'Tournez la roue et gagnez des points boutique ! Tentez votre chance chaque jour.',
    icon: <CircleDot size={32} />,
    path: '/game/wheel',
    color: '#D4AF37',
    available: true,
  },
  {
    id: 'coming-soon-1',
    title: 'Loterie',
    description: 'Bientôt disponible — Achetez des tickets et tentez de gagner le gros lot.',
    icon: <Trophy size={32} />,
    path: '#',
    color: '#9333ea',
    available: false,
  },
  {
    id: 'coming-soon-2',
    title: 'Mini-Jeux',
    description: 'Bientôt disponible — Des mini-jeux quotidiens pour gagner des récompenses.',
    icon: <Dices size={32} />,
    path: '#',
    color: '#06b6d4',
    available: false,
  },
];

export default function GameHub() {
  return (
    <AccessControl pageName="WheelGame">
      <div className="min-h-screen pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles size={14} />
              Centre de Jeux
            </div>
            <h1 className="text-4xl md:text-6xl font-cinzel font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-luxury-goldLight via-luxury-gold to-luxury-gold/70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-4">
              Jeux & Récompenses
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">
              Jouez, gagnez des points et échangez-les contre des récompenses exclusives dans la boutique.
            </p>
          </motion.div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {game.available ? (
                  <Link to={game.path} className="block group">
                    <div className="glass p-8 rounded-2xl border border-white/5 hover:border-luxury-gold/40 transition-all duration-300 h-full relative overflow-hidden group-hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]">
                      {/* Glow */}
                      <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"
                        style={{ backgroundColor: game.color }}
                      />

                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${game.color}20`, color: game.color }}
                      >
                        {game.icon}
                      </div>

                      <h3 className="text-xl font-cinzel font-bold text-white uppercase tracking-wider mb-3 group-hover:text-luxury-gold transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed mb-6">
                        {game.description}
                      </p>

                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all"
                        style={{ borderColor: `${game.color}40`, color: game.color, backgroundColor: `${game.color}10` }}
                      >
                        Jouer maintenant →
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="glass p-8 rounded-2xl border border-white/5 h-full relative overflow-hidden opacity-50 cursor-not-allowed">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: `${game.color}10`, color: game.color }}
                    >
                      {game.icon}
                    </div>
                    <h3 className="text-xl font-cinzel font-bold text-white uppercase tracking-wider mb-3">
                      {game.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                      {game.description}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-gray-500 text-xs font-bold uppercase tracking-wider border border-white/10">
                      🔒 Bientôt disponible
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AccessControl>
  );
}
