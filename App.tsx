
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Profile, SiteSetting } from './types';
import { LanguageProvider } from './LanguageContext';
import { PageVisibilityProvider } from './PageVisibilityContext';
import { MusicProvider } from './MusicContext';
import { siteConfig } from './site-config';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Rules from './pages/Rules';
import Community from './pages/Community';
import Media from './pages/Media';
import Shop from './pages/Shop';
import About from './pages/About';
import Admin from './pages/Admin';
import Login from './pages/Login';

import AuthCallback from './pages/AuthCallback';
import ProfilePage from './pages/Profile';
import Chat from './pages/Chat';
import Blog from './pages/Blog';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LocationPermission from './components/LocationPermission';
import ConfigError from './components/ConfigError';
import MusicPlayer from './components/MusicPlayer';
import BannedScreen from './components/BannedScreen';

const AppContent = () => {
  // Check if Supabase is properly configured
  if (!isSupabaseConfigured()) {
    return (
      <ConfigError
        title="Configuration Supabase Manquante"
        error={`Les variables d'environnement Supabase ne sont pas configurées.\n\nVariables requises:\n• VITE_SUPABASE_URL\n• VITE_SUPABASE_ANON_KEY\n\nAssurez-vous que le fichier .env.local existe et contient ces variables.`}
      />
    );
  }

  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [background, setBackground] = useState<{ value: string; type: 'image' | 'video' } | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Système de Presence (Heartbeat)
    let heartbeatInterval: any;

    const updatePresence = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.id) {
        // SOLUTION FINALE : On met juste à jour l'heure. Si l'heure est récente, le joueur est ONLINE.
        await supabase
          .from('profiles')
          .update({
            last_seen: new Date().toISOString()
          })
          .eq('id', currentSession.user.id);
      }
    };

    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      updatePresence();
      heartbeatInterval = setInterval(updatePresence, 30000);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        localStorage.removeItem(`geo-notification-refused-${session.user.id}`);
        fetchProfile(session.user.id);
        startHeartbeat();
      } else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        localStorage.removeItem(`geo-notification-refused-${session.user.id}`);
        fetchProfile(session.user.id);
        if (event === 'SIGNED_IN') startHeartbeat();
      } else {
        setProfile(null);
        setLoading(false);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);

  // Charger le background global une fois au démarrage
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

  // ❌ Auto-refresh DÉSACTIVÉ
  // useEffect(() => {
  //   if (profile && profile.role !== 'admin') {
  //     const refreshInterval = setInterval(() => {
  //       window.location.reload();
  //     }, 60000);
  //     return () => clearInterval(refreshInterval);
  //   }
  // }, [profile]);

  const fetchProfile = async (userId: string) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      // --- SYNCHRONISATION AUTOMATIQUE INFOS DISCORD (Avatar + ID) ---
      // On récupère les dernières infos fournies par Discord (via les métadonnées de session)
      const metadata = currentSession?.user?.user_metadata;
      const discordAvatar = metadata?.avatar_url;
      const discordId = metadata?.sub || metadata?.provider_id;

      const updates: any = {};
      if (discordAvatar && discordAvatar !== data.avatar_url) updates.avatar_url = discordAvatar;
      if (discordId && discordId !== data.provider_id) updates.provider_id = discordId;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        // Mise à jour de l'objet local pour affichage immédiat
        if (updates.avatar_url) data.avatar_url = updates.avatar_url;
        if (updates.provider_id) data.provider_id = updates.provider_id;
      }

      setProfile(data);
      // Si l'utilisateur est banni, afficher l'écran et attendre son clic
      if (data.banned) {
        console.warn('⛔ UTILISATEUR BANNI - ÉCRAN DE BANNISSEMENT');
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-luxury-dark">
        <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  /*
  // Show location permission screen if user is logged in but hasn't authorized location
  if (showLocationPermission && session) {
    return (
      <LocationPermission
        userId={session.user.id}
        onLocationGranted={() => {
          setShowLocationPermission(false);
          fetchProfile(session.user.id);
        }}
      />
    );
  }
  */

  // ⛔ Si l'utilisateur est banni, afficher l'écran de bannissement
  if (profile && profile.banned) {
    const handleBannedKick = async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      window.location.href = '/#/';
    };

    return <BannedScreen onKick={handleBannedKick} />;
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-luxury-gold selection:text-black relative">
      {/* Global Background - Visible on ALL pages */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {background && (
          background.type === 'video' ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              key={background.value}
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

      {/* Content - Z index higher than background */}
      <div className="relative z-10">
        <Navbar profile={profile} />
        <main className="flex-grow">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/features" element={<Features />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/about" element={<About />} />
              <Route path="/community" element={<Community />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/blog" element={<Blog />} />

              {/* Protected Routes */}
              <Route
                path="/media"
                element={session ? <Media /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin"
                element={(profile && profile.role === 'admin') ? <Admin /> : <Navigate to="/" />}
              />

              <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" />} />
              <Route path="/chat" element={session ? <Chat /> : <Navigate to="/login" />} />

              {/* Auth Routes */}
              <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
        <MusicPlayer />
      </div>
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <PageVisibilityProvider>
        <MusicProvider>
          <Router>
            <AppContent />
          </Router>
        </MusicProvider>
      </PageVisibilityProvider>
    </LanguageProvider>
  );
};

export default App;
