
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          // using HashRouter, include the hash so user lands on the correct route
          redirectTo: `${window.location.origin}/#/auth/callback`
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
      className="min-h-screen flex items-center justify-center bg-luxury-dark px-6 py-20 relative overflow-hidden"
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Email professionnel</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-6 py-4 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-luxury-gold transition-all"
                placeholder="nom@exemple.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-6 py-4 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-luxury-gold transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-luxury-gold text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 button-glow transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? 'Chargement...' : 'Se Connecter'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            aria-label="Se connecter avec Discord"
            className="w-full py-4 bg-[#5865F2] text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 mt-4 hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {loading ? 'Chargement...' : 'Se connecter avec Discord'}
          </button>
        </div>

        <div className="mt-10 text-center space-y-4">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
            Pas encore membre ? <Link to="/signup" className="text-luxury-gold hover:text-white transition-colors">Créer un compte</Link>
          </p>
          <div className="w-12 h-[1px] bg-luxury-gold/30 mx-auto"></div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest leading-loose">
            En vous connectant, vous acceptez nos<br/> conditions d'utilisation et notre politique.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
