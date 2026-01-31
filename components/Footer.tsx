
import React from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../site-config';
import { Twitter, Instagram, Youtube, Send } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  const [serverStats, setServerStats] = React.useState({
    players: siteConfig.server.playersOnline,
    maxPlayers: siteConfig.server.maxPlayers
  });

  React.useEffect(() => {
    const fetchServerData = async () => {
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://servers-frontend.fivem.net/api/servers/single/vzbjxk?t=${timestamp}`)}`);
        if (!response.ok) return;
        const json = await response.json();
        const result = JSON.parse(json.contents);
        const data = result.Data;
        if (data) {
          setServerStats({
            players: data.clients || 0,
            maxPlayers: data.sv_maxclients || 300
          });
        }
      } catch (error) {
        console.error('FiveM API Error (Footer):', error);
      }
    };

    fetchServerData();
    const interval = setInterval(fetchServerData, 10000); // 10 secondes
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="bg-luxury-dark border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-1">
            <img src="https://i.postimg.cc/L4wgGYg6/ATC.png" alt="Atlantic RP" className="h-16 w-auto mb-6" />
            <h2 className="font-cinzel text-2xl font-black text-luxury-gold mb-3 tracking-widest">ATLANTIC RP</h2>
            <p className="text-gray-400 leading-relaxed text-sm">
              L'expérience Roleplay ultime inspirée par le luxe et l'exclusivité. Rejoignez une communauté mature et passionnée.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Navigation</h4>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li><Link to="/" className="hover:text-luxury-gold transition-colors">{t('nav.home')}</Link></li>
              <li><Link to="/features" className="hover:text-luxury-gold transition-colors">{t('nav.features')}</Link></li>
              <li><Link to="/rules" className="hover:text-luxury-gold transition-colors">{t('nav.rules')}</Link></li>
              <li><Link to="/media" className="hover:text-luxury-gold transition-colors">{t('nav.media')}</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Suivez-nous</h4>
            <div className="flex gap-4 mb-6">
              <a href={siteConfig.links.twitter} target="_blank" className="w-10 h-10 glass flex items-center justify-center rounded-lg hover:bg-black hover:text-white transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" />
                </svg>
              </a>
              <a href={siteConfig.links.instagram} target="_blank" className="w-10 h-10 glass flex items-center justify-center rounded-lg hover:text-luxury-gold transition-all">
                <Instagram size={20} />
              </a>
              <a href={siteConfig.links.youtube} target="_blank" className="w-10 h-10 glass flex items-center justify-center rounded-lg hover:text-luxury-gold transition-all">
                <Youtube size={20} />
              </a>
            </div>
            <a
              href={siteConfig.links.discord}
              target="_blank"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-luxury-gold transition-colors"
            >
              {t('footer.discord')}
            </a>
          </div>

          {/* Newsletter / Connect */}
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Status Serveur</h4>
            <div className="glass p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Joueurs en ligne</span>
                <span className="text-xs font-bold text-luxury-gold">{serverStats.players} / {serverStats.maxPlayers}</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-luxury-gold h-full transition-all duration-1000"
                  style={{ width: `${(serverStats.players / serverStats.maxPlayers) * 100}%` }}
                />
              </div>
              <p className="mt-4 text-[10px] text-gray-500 uppercase text-center tracking-widest">
                IP: {siteConfig.server.ip}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} Atlantic RP. {t('footer.rights')}
          </p>
          <div className="flex gap-6 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
            <a href="#" className="hover:text-luxury-gold">Conditions</a>
            <a href="#" className="hover:text-luxury-gold">Politique</a>
            <a href="#" className="hover:text-luxury-gold">{t('footer.contact')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
