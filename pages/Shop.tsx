import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import AccessControl from '../components/AccessControl';

const Shop: React.FC = () => {
  const { t } = useLanguage();

  return (
    <AccessControl pageName="Shop">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pt-28 md:pt-32 lg:pt-36 pb-24 bg-luxury-dark min-h-screen"
      >
      <div className="max-w-7xl mx-auto px-6">
        {/* FLOATING UNAVAILABLE NOTIFICATION */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="fixed top-32 right-6 z-50"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-3 rounded-full bg-red-600 text-white font-black text-lg shadow-2xl border-2 border-red-400 uppercase tracking-wider flex items-center gap-2"
          >
            <AlertTriangle size={24} />
            {t('shop.unavailable')}
          </motion.div>
        </motion.div>

        {/* Notification Banner - Ne se ferme pas */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12 p-6 md:p-8 glass rounded-2xl border-l-4 border-red-600 bg-gradient-to-r from-red-600/20 to-transparent"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <div className="flex-grow">
              <h3 className="text-3xl md:text-5xl font-cinzel font-black text-red-500 mb-2 uppercase tracking-wider">
                🚧 {t('shop.comingSoonTitle')}
              </h3>
              <p className="text-gray-300 text-xl mb-4 font-semibold">
                {t('shop.comingSoonDesc')}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-red-500 uppercase tracking-widest">{t('shop.status')}:</span>
                  <span className="px-6 py-3 rounded-lg bg-red-600/30 text-red-400 font-black uppercase text-sm tracking-widest border border-red-500/50">
                    {t('shop.unavailable')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-luxury-gold uppercase tracking-widest">{t('shop.opening')}:</span>
                  <span className="px-6 py-3 rounded-lg bg-luxury-gold/20 text-luxury-gold font-black uppercase text-sm tracking-widest border border-luxury-gold/50">
                    {t('shop.comingSoon')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Placeholder Content */}
        <header className="text-center mb-16">
          <h2 className="font-cinzel text-4xl md:text-5xl font-black mb-4">
            {t('shop.title')} <span className="text-luxury-gold">ATLANTIC RP</span>
          </h2>
          <p className="text-gray-400 font-light max-w-2xl mx-auto text-lg">
            {t('shop.subtitle')}
          </p>
        </header>

        {/* Coming Soon Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: t('shop.skins'), icon: '👤' },
            { title: t('shop.vehicles'), icon: '🚗' },
            { title: t('shop.accessories'), icon: '⌚' },
            { title: t('shop.packs'), icon: '🎁' },
            { title: t('shop.clothes'), icon: '👔' },
            { title: t('shop.weapons'), icon: '🔫' }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass p-10 rounded-2xl text-center border border-white/10 hover:border-luxury-gold/30 transition-all"
            >
              <div className="text-6xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-cinzel font-bold text-white mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{t('shop.comingSoon')}</p>
            </motion.div>
          ))}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 p-10 glass rounded-2xl border border-luxury-gold/20 bg-luxury-gold/5 text-center"
        >
          <AlertCircle className="text-luxury-gold mx-auto mb-4" size={32} />
          <h3 className="text-2xl font-cinzel font-bold text-white mb-4">{t('shop.stayInformed')}</h3>
          <p className="text-gray-300 text-lg mb-6">
            {t('shop.subscribeDiscord')}
          </p>
          <a
            href="https://discord.com/invite/atlantic-roleplay-492135997342220318"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-luxury-gold text-black font-black rounded-xl uppercase tracking-widest button-glow transition-all hover:scale-105"
          >
            {t('shop.joinDiscord')}
          </a>
        </motion.div>
      </div>
      </motion.div>
    </AccessControl>
  );
};

export default Shop;
