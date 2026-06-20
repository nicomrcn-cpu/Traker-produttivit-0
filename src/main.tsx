import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registra il Service Worker
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrato con successo con scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Registrazione Service Worker fallita:', error);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Anche in sviluppo registriamo per testare le notifiche push simulate
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrato in Dev:', registration.scope);
      })
      .catch((err) => console.log('SW Dev err:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
