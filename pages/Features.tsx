
import React from 'react';
import { motion } from 'framer-motion';
import { Car, Briefcase, Zap, Map, ShieldAlert, Heart, Wallet, Radio } from 'lucide-react';
import AccessControl from '../components/AccessControl';

const featuresList = [
  {
    title: "Économie Réaliste",
    description: "Advanced financial management. Invest in real estate, run your own business, or become a shadow magnate. The city’s economy is closely monitored and managed by the administration, especially the owner, to maintain balance, stability, and high-quality roleplay.",
    icon: Wallet,
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    title: "Véhicules Moddés",
    description: "Over 100 ultra-detailed imported vehicles with custom handling and physics for total driving immersion. All server vehicles are managed and distributed through Tebex.",
    icon: Car,
    color: "from-red-500/20 to-orange-500/20"
  },
  {
    title: "Métiers Innovants",
    description: "Exclusive job scripts featuring progression systems and unique multiplayer interactions. Jobs can be done solo or in groups, with a mix of legal and illegal professions for deeper and more dynamic roleplay.",
    icon: Briefcase,
    color: "from-emerald-500/20 to-teal-500/20"
  },
  {
    title: "Système Illégal",
    description: "A rich underground world. Drugs, complex bank heists, and dynamic territorial wars. Diego, the mafia boss, is the one who controls and manages the majority of this world and the illegal system as a whole.",
    icon: ShieldAlert,
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    title: "Optimisation de Pointe",
    description: "A smooth and stable experience guaranteed thanks to rigorous in-house development and fully optimized resources. The server runs on ultra-high-performance hosting with dedicated slots capable of supporting over 300 players, delivering 100+ FPS powered by next-generation 2025 CPUs and cutting-edge infrastructure.",
    icon: Zap,
    color: "from-yellow-500/20 to-amber-500/20"
  },
  {
    title: "Housing Personnalisé",
    description: "Design your interior exactly how you want with our interactive decoration system and hundreds of furniture options. Everything is fully customizable, including advanced internal modifications through a Gizmo menu.",
    icon: Map,
    color: "from-indigo-500/20 to-violet-500/20"
  }
];

const Features: React.FC = () => {
  return (
    <AccessControl pageName="Features">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pt-528 md:pt-32 lg:pt-36 pb-24 bg-luxury-dark min-h-screen"
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
              Dive into a universe custom-built by our developers. Every system has been carefully designed to maximize your gameplay experience and immersion, led by Willson, widely regarded as one of the best developers in Morocco.
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
    </AccessControl>
  );
};

export default Features;
