
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDiscordLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const APP_URL = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
      const redirectTo = `${APP_URL}/#/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          // using HashRouter, include the hash so user lands on the correct route
          redirectTo
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // on success Supabase will redirect the user to the `redirectTo` URL
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la connexion');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center bg-luxury-dark px-6 py-20 pt-28 md:pt-32 lg:pt-36 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.05),_transparent_40%)]"></div>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md glass p-10 md:p-14 rounded-[3rem] border border-white/5 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-luxury-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-luxury-gold">
            <LogIn size={32} />
          </div>
          <h2 className="font-cinzel text-3xl font-black mb-2 uppercase tracking-widest">Connexion</h2>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-tighter">Accédez à votre espace membre</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest rounded-xl text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleDiscordLogin}
          disabled={loading}
          aria-label="Discord"
          className="w-full py-5 bg-[#5865F2] text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 transition-all text-lg"
        >
          {loading ? 'Chargement...' : '🔗 Se connecter avec Discord'}
        </button>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest leading-loose">
            En vous connectant, vous acceptez nos<br/> conditions d'utilisation et notre politique.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
