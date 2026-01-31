
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteConfig } from '../site-config';
import { Play, Users, Shield, Server, ArrowRight, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SiteSetting } from '../types';
import { useLanguage } from '../LanguageContext';
import Scene3D from '../components/Scene3D';

const Home: React.FC = () => {
  const [background, setBackground] = useState<{ value: string; type: 'image' | 'video' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [serverStats, setServerStats] = useState({
    players: siteConfig.server.playersOnline,
    maxPlayers: siteConfig.server.maxPlayers,
    resources: 290
  });
  const { t } = useLanguage();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`connect ${siteConfig.server.ip}`);
    setCopied(true);
    setShowTutorial(true);

    // Ouvrir FiveM en même temps
    window.location.href = siteConfig.server.connectUrl;
  };

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

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        // Ajout d'un timestamp pour forcer le rafraîchissement (anti-cache)
        const timestamp = new Date().getTime();
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://servers-frontend.fivem.net/api/servers/single/vzbjxk?t=${timestamp}`)}`);
        if (!response.ok) return;

        const json = await response.json();
        const result = JSON.parse(json.contents);
        const data = result.Data;

        if (data) {
          setServerStats({
            players: data.clients || 0,
            maxPlayers: data.sv_maxclients || 300,
            resources: data.resources ? data.resources.length : 290
          });
        }
      } catch (error) {
        console.error('FiveM API Error:', error);
      }
    };

    fetchServerData();
    const interval = setInterval(fetchServerData, 10000); // Réduit à 10 secondes
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen pt-28 md:pt-32 lg:pt-10"
    >

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
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

        {/* Content & 3D Model Grid */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-full pt-20 lg:pt-0">

          {/* Left Column: Text Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center lg:justify-start mb-8"
            >
              <span className="px-4 py-1.5 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 text-luxury-gold text-xs font-bold uppercase tracking-[0.3em] backdrop-blur-sm">
                {t('home.subtitle')}
              </span>
            </motion.div>

            <motion.h1
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-cinzel text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-tight"
            >
              {t('home.title')}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gray-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light"
            >
              {t('home.description')}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6"
            >
              <button
                onClick={copyToClipboard}
                className="w-full sm:w-auto px-10 py-5 rounded-xl bg-luxury-gold text-black font-black flex items-center justify-center gap-3 transition-all hover:scale-105 button-glow text-lg uppercase tracking-wider"
              >
                <Play fill="black" size={20} />
                {copied ? '✓ Copié!' : 'Rejoindre le Serveur'}
              </button>
              <a
                href={siteConfig.links.discord}
                target="_blank"
                className="w-full sm:w-auto px-10 py-5 rounded-xl glass text-white font-bold flex items-center justify-center gap-3 transition-all hover:bg-white/10 text-lg uppercase tracking-wider"
              >
                DISCORD
                <ArrowRight size={20} />
              </a>
            </motion.div>
          </div>

          {/* Right Column: 3D Model */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-[500px] lg:h-[800px] w-full order-1 lg:order-2 flex items-center justify-center"
          >
            <Scene3D />
          </motion.div>

        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 z-20 pointer-events-none"
        >
          <span className="text-[10px] uppercase font-bold tracking-[0.4em]"> atc</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-luxury-gold to-transparent"></div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-luxury-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Joueurs Actifs RÉEL-TIMES ", value: `${serverStats.players}`, icon: Users, sub: "Communauté engagée" },
              { label: "Scripts Uniques", value: `${serverStats.resources}`, icon: Server, sub: "Optimisation maximale" },
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

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTutorial(false)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass rounded-3xl overflow-hidden border border-white/10 p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-cinzel font-black text-white">Rejoindre le Serveur</h2>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Ouvrir FiveM</h3>
                    <p className="text-gray-400">Lancez l'application FiveM sur votre ordinateur</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Appuyez sur F8</h3>
                    <p className="text-gray-400">Ouvrez la console en appuyant sur F8</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Collez la commande</h3>
                    <p className="text-gray-400 mb-3">Appuyez sur Ctrl+V pour coller la commande</p>
                    <div className="bg-black/50 border border-luxury-gold/50 rounded-lg p-4 font-mono text-luxury-gold">
                      connect {siteConfig.server.ip}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-luxury-gold text-black flex items-center justify-center font-bold">4</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Appuyez sur Entrée</h3>
                    <p className="text-gray-400">Patientez pendant le chargement du serveur</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowTutorial(false)}
                className="w-full mt-8 py-3 bg-luxury-gold text-black font-bold rounded-xl uppercase tracking-widest transition-all hover:scale-105"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
