
import React from 'react';
import { motion } from 'framer-motion';
import { siteConfig } from '../site-config';
import { MessageSquare, Twitter, Instagram, Youtube, Users } from 'lucide-react';
import AccessControl from '../components/AccessControl';

const Community: React.FC = () => {
  return (
    <AccessControl pageName="Community">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pt-32 md:pt-40 lg:pt-48 pb-24 bg-luxury-dark min-h-screen"
      >
        <div className="max-w-7xl mx-auto px-6">
          <header className="text-center mb-16">
            <h2 className="font-cinzel text-4xl md:text-5xl font-black mb-4 uppercase">Rejoignez le <span className="text-luxury-gold">Cercle</span></h2>
            <p className="text-gray-400 font-light max-w-xl mx-auto">Atlantic RP n'est pas qu'un serveur, c'est une famille prestigieuse. Suivez-nous sur tous nos réseaux.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: "Discord",
                icon: (
                  <MessageSquare size={48} className="text-luxury-gold group-hover:text-white transition-colors mb-6" />
                ),
                link: siteConfig.links.discord,
                color: "hover:bg-[#5865F2]",
                sub: "Discussions & Support"
              },
              {
                name: "X (Twitter)",
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-luxury-gold group-hover:text-white transition-colors mb-6">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" />
                  </svg>
                ),
                link: siteConfig.links.twitter,
                color: "hover:bg-black",
                sub: "Dernières actualités"
              },
              {
                name: "Instagram",
                icon: (
                  <Instagram size={48} className="text-luxury-gold group-hover:text-white transition-colors mb-6" />
                ),
                link: siteConfig.links.instagram,
                color: "hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500",
                sub: "Coulisses & Photos"
              },
              {
                name: "YouTube",
                icon: (
                  <Youtube size={48} className="text-luxury-gold group-hover:text-white transition-colors mb-6" />
                ),
                link: siteConfig.links.youtube,
                color: "hover:bg-[#FF0000]",
                sub: "Trailers & Guides"
              }
            ].map((social, i) => (
              <motion.a
                key={i}
                href={social.link}
                target="_blank"
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass p-10 rounded-3xl flex flex-col items-center text-center transition-all duration-500 hover:-translate-y-3 ${social.color} hover:text-white group`}
              >
                {social.icon}
                <h3 className="text-2xl font-cinzel font-bold mb-2">{social.name}</h3>
                <p className="text-gray-500 text-sm group-hover:text-white/80">{social.sub}</p>
              </motion.a>
            ))}
          </div>

          {/* Community highlight section */}
          <section className="mt-24 glass rounded-[3rem] overflow-hidden">
            <div className="flex flex-col lg:flex-row items-stretch">
              <div className="lg:w-1/2 p-12 md:p-20 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-luxury-gold font-bold mb-6 text-sm tracking-widest uppercase">
                  <Users size={20} />
                  Plus de 10,000 membres
                </div>
                <h3 className="text-4xl md:text-5xl font-cinzel font-black mb-8 leading-tight">UNE EXPÉRIENCE SOCIALE SANS ÉGAL</h3>
                <p className="text-gray-400 text-lg leading-relaxed mb-10 font-light">
                  Participez à des événements communautaires réguliers, des concours de photographie et des débats sur l'avenir du serveur. Votre voix compte chez nous.
                </p>
                <button className="self-start px-8 py-4 bg-luxury-gold text-black font-black rounded-xl uppercase tracking-widest button-glow transition-all">
                  VOIR LE CALENDRIER
                </button>
              </div>
              <div className="lg:w-1/2 bg-white/5 relative min-h-[400px]">
                <img
                  src="https://i.postimg.cc/g2CwrnP9/imae.png"
                  alt="Community life"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-luxury-dark via-transparent to-transparent"></div>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </AccessControl>
  );
};

export default Community;

