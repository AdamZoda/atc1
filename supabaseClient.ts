
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('❌ ERREUR CONFIGURATION SUPABASE');
  console.error('Variables manquantes ou non configurées :');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
  console.error('\n📋 Solution:');
  console.error('1. Créez le fichier .env.local');
  console.error('2. Copiez les variables de .env.example');
  console.error('3. Redémarrez le serveur');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');

// Export validation function for UI
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));
};
