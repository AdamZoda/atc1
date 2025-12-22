
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import { Profile } from './types';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Rules from './pages/Rules';
import Community from './pages/Community';
import Media from './pages/Media';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';

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

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
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
            
            {/* Protected Routes */}
            <Route 
              path="/media" 
              element={session ? <Media /> : <Navigate to="/signup" />} 
            />
            <Route 
              path="/admin" 
              element={(profile && profile.role === 'admin') ? <Admin /> : <Navigate to="/" />} 
            />
            
            {/* Auth Routes */}
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
