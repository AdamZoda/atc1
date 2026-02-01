
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/responsive.css';
import App from './App';

// Nettoyage global de la console pour la confidentialité et le professionnalisme
// On désactive les logs par défaut pour répondre à la demande de console vide
const isProd = (import.meta as any).env?.PROD || process.env.NODE_ENV === 'production';
if (isProd || true) { // Toujours actif pour satisfaire l'utilisateur
  const noop = () => { };
  (console as any).log = noop;
  (console as any).debug = noop;
  (console as any).info = noop;
  // On garde console.error et console.warn pour les erreurs critiques
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
