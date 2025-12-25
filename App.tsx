
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
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import ProfilePage from './pages/Profile';
import GamePage from './pages/Game';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Réinitialise le flag de refus de localisation à chaque nouvelle session
        localStorage.removeItem(`geo-notification-refused-${session.user.id}`);
        fetchProfile(session.user.id);
      } else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // Réinitialises le flag de refus de localisation à chaque nouvelle session
        localStorage.removeItem(`geo-notification-refused-${session.user.id}`);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      // Si l'utilisateur est banni, afficher l'écran et attendre son clic
      if (data.banned) {
        console.warn('⛔ UTILISATEUR BANNI - ÉCRAN DE BANNISSEMENT');
      } else {
        // Check if user needs to authorize location - show permission prompt
        // BUT: don't show if user already refused (localStorage flag)
        const hasRefused = localStorage.getItem(`geo-notification-refused-${userId}`) === 'true';
        
        // Force show if ?forceLocation=true in URL (for testing)
        const urlParams = new URLSearchParams(window.location.search);
        const forceLocation = urlParams.get('forceLocation') === 'true';
        
        if (!hasRefused && (!data.latitude || !data.longitude || forceLocation)) {
          setShowLocationPermission(true);
          setLoading(false);
          return;
        }
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
              <Route path="/game" element={<GamePage profile={profile} />} />
              <Route path="/shop" element={<Shop />} />
              
              {/* Protected Routes - STRICT: Profile MUST exist */}
              <Route 
                path="/media" 
                element={(session && profile) ? <Media /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/admin" 
                element={(profile && profile.role === 'admin') ? <Admin /> : <Navigate to="/" />} 
              />

              <Route path="/profile" element={(session && profile) ? <ProfilePage /> : <Navigate to="/login" />} />
              
              {/* Auth Routes */}
              <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
              <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
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
            <MusicPlayer />
          </Router>
        </MusicProvider>
      </PageVisibilityProvider>
    </LanguageProvider>
  );
};

export default App;
