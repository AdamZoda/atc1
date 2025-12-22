
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Fixed: Added AnimatePresence to the framer-motion import
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Shield, Layout, Users, FileText, Image, LogIn } from 'lucide-react';
import { Profile, NavLink } from '../types';
import { siteConfig } from '../site-config';
import { supabase } from '../supabaseClient';

interface NavbarProps {
  profile: Profile | null;
}

const Navbar: React.FC<NavbarProps> = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks: NavLink[] = [
    { label: 'Accueil', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Règlements', path: '/rules' },
    { label: 'Communauté', path: '/community' },
    { label: 'Galerie Media', path: '/media', restricted: true },
  ];

  if (profile?.role === 'admin') {
    navLinks.push({ label: 'Admin', path: '/admin', adminOnly: true });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed w-full z-50 px-4 py-4 md:px-10">
      <div className="max-w-7xl mx-auto glass rounded-2xl flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-luxury-gold to-luxury-accent p-[2px]">
            <div className="w-full h-full bg-black rounded-[7px] flex items-center justify-center font-cinzel font-black text-luxury-gold text-xl">
              A
            </div>
          </div>
          <span className="hidden md:block font-cinzel text-xl font-bold tracking-widest bg-gradient-to-r from-luxury-gold to-white bg-clip-text text-transparent">
            ATLANTIC RP
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative font-medium transition-colors duration-300 hover:text-luxury-gold ${
                location.pathname === link.path ? 'text-luxury-gold' : 'text-gray-300'
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
          ))}
        </div>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center gap-4">
          {profile ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-white">{profile.username}</span>
                <span className="text-[10px] uppercase tracking-tighter text-luxury-gold">{profile.role}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-luxury-gold hover:bg-luxury-goldLight transition-all text-black font-bold button-glow"
            >
              <LogIn size={18} />
              CONNEXION
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
              {navLinks.map((link) => (
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
