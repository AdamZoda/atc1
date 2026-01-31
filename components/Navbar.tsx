
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Fixed: Added AnimatePresence to the framer-motion import
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Shield, Layout, Users, FileText, Image, LogIn } from 'lucide-react';
import { Profile, NavLink } from '../types';
import { siteConfig } from '../site-config';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../LanguageContext';
import { usePageVisibility } from '../PageVisibilityContext';

interface NavbarProps {
  profile: Profile | null;
}

const DEFAULT_AVATAR = 'https://i.postimg.cc/rF1jc0R2/depositphotos-51405259-stock-illustration-male-avatar-profile-picture-use.jpg';

const Navbar: React.FC<NavbarProps> = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fallbackName, setFallbackName] = useState<string | null>(null);
  const [isGamePageVisible, setIsGamePageVisible] = useState(true);
  const location = useLocation();
  const { t } = useLanguage();
  const { isPageVisible } = usePageVisibility();

  const getNavLinks = (): NavLink[] => {
    const links: NavLink[] = [
      { label: t('nav.home'), path: '/', visible: isPageVisible('Home') },
      { label: t('nav.features'), path: '/features', visible: isPageVisible('Features') },
      { label: t('nav.rules'), path: '/rules', visible: isPageVisible('Rules') },
      { label: 'À propos', path: '/about', visible: isPageVisible('About') },
      { label: t('nav.community'), path: '/community', visible: isPageVisible('Community') },
      ...(isPageVisible('Game') || profile?.role === 'admin' ? [{ label: 'Jeu', path: '/game', visible: true }] : []),
      { label: 'Shop', path: '/shop', visible: isPageVisible('Shop') },
      { label: t('nav.media'), path: '/media', restricted: true, visible: isPageVisible('Gallery') },
    ];

    if (profile?.role === 'admin') {
      links.push({ label: t('nav.admin'), path: '/admin', adminOnly: true, visible: true });
    }

    return links;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    // If there's no profile username, attempt to read provider identity (Discord) from the current session
    if (!profile) {
      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          const user = (data as any)?.user;
          if (user) {
            const identity = (user.identities || []).find((i: any) => i.provider === 'discord');
            if (identity?.identity_data) {
              const idata = identity.identity_data as any;
              const name = idata.username ? `${idata.username}${idata.discriminator ? '#' + idata.discriminator : ''}` : user.email || user.id;
              setFallbackName(name);
            } else {
              setFallbackName(user.email || null);
            }
          }
        } catch (e) {
          console.warn('Could not read session identity for fallback name', e);
        }
      })();
    }
  }, [profile]);

  // Fetch game page visibility
  useEffect(() => {
    const fetchGamePageVisibility = async () => {
      try {
        const { data } = await supabase
          .from('game_admin_settings')
          .select('page_visible')
          .eq('id', 'game-settings')
          .single();

        if (data) {
          setIsGamePageVisible(data.page_visible ?? true);
        }
      } catch (error) {
        console.error('Error fetching game page visibility:', error);
      }
    };

    fetchGamePageVisibility();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('public:game_admin_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_admin_settings' }, () =>
        fetchGamePageVisibility()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="fixed w-full z-50 px-2 py-4 md:px-10">
      <div className="max-w-7xl mx-auto glass rounded-2xl flex items-center justify-between px-4 md:px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <img src="https://i.postimg.cc/L4wgGYg6/ATC.png" alt="Atlantic RP" className="h-10 md:h-12 w-auto" />
          <span className="hidden md:block font-cinzel text-sm md:text-xl font-bold tracking-widest bg-gradient-to-r from-luxury-gold to-white bg-clip-text text-transparent">
            ATLANTIC RP
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-8 flex-wrap justify-center flex-1 mx-4">
          {getNavLinks().map((link) => (
            link.visible === true && (
              <Link
                key={link.path}
                to={link.path}
                className={`relative font-medium text-xs md:text-sm transition-colors duration-300 hover:text-luxury-gold whitespace-nowrap ${location.pathname === link.path ? 'text-luxury-gold' : 'text-gray-300'
                  }`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="activeLink"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-luxury-gold"
                  />
                )}
              </Link>
            )
          ))}
        </div>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center gap-2 md:gap-4 flex-shrink-0">
          {profile ? (
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/profile" className="flex items-center gap-2 md:gap-3">
                <img
                  src={profile.avatar_url || DEFAULT_AVATAR}
                  alt="avatar"
                  className="w-8 md:w-10 h-8 md:h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || profile.username || 'User')}&background=random&color=fff`;
                  }}
                />
              </Link>

              <div className="hidden sm:flex flex-col items-end">
                {(() => {
                  const nameFromProfile = profile?.display_name || profile?.username || '';
                  const isEmail = nameFromProfile.includes && nameFromProfile.includes('@');
                  const display = !isEmail && nameFromProfile ? nameFromProfile : (fallbackName || nameFromProfile || profile?.id);
                  return (
                    <Link to="/profile" className="text-xs md:text-sm font-semibold text-white hover:underline truncate">
                      {display}
                    </Link>
                  );
                })()}
                <span className="text-[8px] md:text-[10px] uppercase tracking-tighter text-luxury-gold">{profile.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 md:px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg bg-luxury-gold hover:bg-luxury-goldLight transition-all text-black text-xs md:text-sm font-bold button-glow flex-shrink-0"
            >
              <LogIn size={16} className="flex-shrink-0" />
              <span className="hidden sm:inline">{t('nav.login')}</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="lg:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-24 left-4 right-4 glass rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex flex-col p-4 gap-4">
              {getNavLinks().map((link) => (
                link.visible === true && (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-3 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between"
                  >
                    <span className={location.pathname === link.path ? 'text-luxury-gold font-bold' : 'text-gray-300'}>
                      {link.label}
                    </span>
                  </Link>
                )
              ))}
              {!profile && (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 w-full py-3 text-center bg-luxury-gold text-black font-bold rounded-xl"
                >
                  CONNEXION
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
