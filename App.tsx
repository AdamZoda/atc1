
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import { Profile } from './types';
import { LanguageProvider } from './LanguageContext';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Rules from './pages/Rules';
import Community from './pages/Community';
import Media from './pages/Media';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import ProfilePage from './pages/Profile';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-refresh pour les utilisateurs normaux (PAS LES ADMINS)
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      // Refresh la page toutes les 30 secondes pour les utilisateurs normaux
      const refreshInterval = setInterval(() => {
        window.location.reload();
      }, 30000); // 30 secondes

      return () => clearInterval(refreshInterval);
    }
  }, [profile]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      // Si l'utilisateur est banni, le déconnecter
      if (data.banned) {
        console.warn('Utilisateur banni détecté');
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
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

  return (
    <div className="min-h-screen flex flex-col selection:bg-luxury-gold selection:text-black">
      <Navbar profile={profile} />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/community" element={<Community />} />
            <Route path="/shop" element={<Shop />} />
            
            {/* Protected Routes */}
            <Route 
              path="/media" 
              element={session ? <Media /> : <Navigate to="/signup" />} 
            />
            <Route 
              path="/admin" 
              element={(profile && profile.role === 'admin') ? <Admin /> : <Navigate to="/" />} 
            />

            <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  );
};

export default App;
