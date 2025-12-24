import React from 'react';
import { usePageVisibility } from '../PageVisibilityContext';
import { useLanguage } from '../LanguageContext';
import { Lock } from 'lucide-react';

interface AccessControlProps {
  pageName: string;
  children: React.ReactNode;
}

const AccessControl: React.FC<AccessControlProps> = ({ pageName, children }) => {
  const { isPageVisible } = usePageVisibility();
  const { t } = useLanguage();

  if (!isPageVisible(pageName)) {
    return (
      <div className="min-h-screen bg-luxury-dark pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Lock className="w-16 h-16 text-luxury-gold mx-auto mb-6" />
          <h1 className="font-cinzel text-4xl font-bold text-white mb-4">
            🔒 INACCESSIBLE
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Cette page est actuellement privée
          </p>
          <p className="text-gray-500 text-sm">
            L'administrateur a désactivé l'accès à cette zone. Veuillez réessayer plus tard.
          </p>
          
          <a 
            href="/" 
            className="mt-8 inline-block px-8 py-3 bg-luxury-gold text-black hover:bg-luxury-goldLight transition-all font-bold uppercase tracking-widest rounded-lg"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AccessControl;
