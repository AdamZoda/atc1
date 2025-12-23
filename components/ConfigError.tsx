import React from 'react';
import { AlertCircle } from 'lucide-react';

const ConfigError: React.FC<{ error: string; title: string }> = ({ error, title }) => {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-luxury-dark px-4">
      <div className="max-w-lg w-full">
        <div className="bg-red-950/30 border border-red-500/50 rounded-lg p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-500 mb-4">{title}</h1>
          
          <div className="bg-black/50 rounded p-4 mb-6 text-left">
            <p className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
              {error}
            </p>
          </div>

          <div className="text-left space-y-3 text-sm text-gray-400">
            <p>📋 <strong>SOLUTION :</strong></p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Créez le fichier <code className="bg-black/30 px-2 py-1 rounded">.env.local</code></li>
              <li>Copiez les variables de <code className="bg-black/30 px-2 py-1 rounded">.env.example</code></li>
              <li>Remplissez avec vos vraies clés Supabase</li>
              <li>Redémarrez le serveur : <code className="bg-black/30 px-2 py-1 rounded">npm run dev</code></li>
            </ol>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-luxury-gold text-black rounded font-bold hover:bg-luxury-goldLight transition"
          >
            Recharger la page
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigError;
