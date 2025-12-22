
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { siteConfig } from '../site-config';
import { Play, Users, Shield, Server, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SiteSetting } from '../types';

const Home: React.FC = () => {
  const [background, setBackground] = useState<{ value: string; type: 'image' | 'video' } | null>(null);

  useEffect(() => {
    const fetchBackground = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'site_background')
        .single();

      if (data) {
        setBackground({ value: data.value, type: data.type });
      } else {
        // Fallback to config
        setBackground({ value: siteConfig.media.heroVideo, type: 'video' });
      }
    };

    fetchBackground();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen"
    >
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          {background && (
            background.type === 'video' ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                key={background.value} // Force reload on source change
                className="w-full h-full object-cover opacity-40"
              >
                <source src={background.value} type="video/mp4" />
              </video>
            ) : (
              <img 
                src={background.value} 
                className="w-full h-full object-cover opacity-40" 
                alt="Background"
              />
            )
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-dark/80 via-luxury-dark/20 to-luxury-dark"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050505_90%)]"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <span className="px-4 py-1.5 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 text-luxury-gold text-xs font-bold uppercase tracking-[0.3em] backdrop-blur-sm">
              L'Excellence du Roleplay
            </span>
          </motion.div>

          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-cinzel text-5xl md:text-8xl font-black mb-6 tracking-tight leading-tight"
          >
            VIVEZ L'<span className="text-luxury-gold text-glow-gold">ABONDANCE</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Découvrez Atlantic RP, le serveur FiveM où le luxe rencontre l'immersion totale. Systèmes exclusifs, économie réaliste et communauté prestigieuse.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <a 
              href={siteConfig.server.connectUrl}
              className="w-full sm:w-auto px-10 py-5 rounded-xl bg-luxury-gold text-black font-black flex items-center justify-center gap-3 transition-all hover:scale-105 button-glow text-lg uppercase tracking-wider"
            >
              <Play fill="black" size={20} />
              Rejoindre le Serveur
            </a>
            <a 
              href={siteConfig.links.discord}
              target="_blank"
              className="w-full sm:w-auto px-10 py-5 rounded-xl glass text-white font-bold flex items-center justify-center gap-3 transition-all hover:bg-white/10 text-lg uppercase tracking-wider"
            >
              Discord Officiel
              <ArrowRight size={20} />
            </a>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"
        >
          <span className="text-[10px] uppercase font-bold tracking-[0.4em]">Découvrir</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-luxury-gold to-transparent"></div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-luxury-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Joueurs Actifs", value: siteConfig.server.playersOnline, icon: Users, sub: "Communauté engagée" },
              { label: "Scripts Uniques", value: "150+", icon: Server, sub: "Optimisation maximale" },
              { label: "Staff Réactif", value: "24/7", icon: Shield, sub: "Sécurité garantie" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-10 rounded-3xl text-center group transition-all hover:border-luxury-gold/50"
              >
                <div className="w-16 h-16 rounded-2xl bg-luxury-gold/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-luxury-gold/20 transition-colors">
                  <stat.icon className="text-luxury-gold" size={32} />
                </div>
                <h3 className="text-4xl font-cinzel font-black text-white mb-2">{stat.value}</h3>
                <p className="text-luxury-gold font-bold uppercase tracking-widest text-xs mb-4">{stat.label}</p>
                <p className="text-gray-500 text-sm">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;
