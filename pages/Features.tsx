
import React from 'react';
import { motion } from 'framer-motion';
import { Car, Briefcase, Zap, Map, ShieldAlert, Heart, Wallet, Radio } from 'lucide-react';

const featuresList = [
  {
    title: "Économie Réaliste",
    description: "Une gestion financière poussée. Investissez dans l'immobilier, gérez votre propre entreprise ou devenez un magnat de l'ombre.",
    icon: Wallet,
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    title: "Véhicules Moddés",
    description: "Plus de 100 véhicules importés ultra-détaillés avec des physiques personnalisées pour une immersion de conduite totale.",
    icon: Car,
    color: "from-red-500/20 to-orange-500/20"
  },
  {
    title: "Métiers Innovants",
    description: "Des scripts de métiers exclusifs avec des systèmes de progression et des interactions multijoueurs uniques.",
    icon: Briefcase,
    color: "from-emerald-500/20 to-teal-500/20"
  },
  {
    title: "Système Illégal",
    description: "Un monde souterrain riche. Drogues, braquages de banques complexes et guerres de territoires dynamiques.",
    icon: ShieldAlert,
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    title: "Optimisation de Pointe",
    description: "Une expérience fluide à 60+ FPS garantie grâce à un développement interne rigoureux et des ressources optimisées.",
    icon: Zap,
    color: "from-yellow-500/20 to-amber-500/20"
  },
  {
    title: "Housing Personnalisé",
    description: "Aménagez votre intérieur comme bon vous semble avec notre système de décoration interactif et des centaines de meubles.",
    icon: Map,
    color: "from-indigo-500/20 to-violet-500/20"
  }
];

const Features: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-24 bg-luxury-dark min-h-screen"
    >
      <div className="max-w-7xl mx-auto px-6">
        <header className="text-center mb-20">
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-cinzel text-4xl md:text-6xl font-black mb-6"
          >
            SYSTÈMES <span className="text-luxury-gold">EXCLUSIFS</span>
          </motion.h2>
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="w-24 h-1 bg-luxury-gold mx-auto mb-8"
          ></motion.div>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
            Plongez dans un univers conçu sur mesure par nos développeurs. Chaque système a été pensé pour maximiser votre plaisir de jeu et votre immersion.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((f, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-3xl glass p-8 transition-all hover:-translate-y-2"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-luxury-gold/10 flex items-center justify-center mb-6 text-luxury-gold group-hover:scale-110 transition-transform">
                  <f.icon size={28} />
                </div>
                <h3 className="text-2xl font-cinzel font-bold text-white mb-4">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm group-hover:text-gray-200 transition-colors">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Features;
