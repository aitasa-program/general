import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Comprova cada minut si hi ha una versió nova i, quan n'hi ha, l'activa i
// recarrega la pàgina automàticament — sense això el service worker antic
// es pot quedar servint una versió obsoleta indefinidament.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60_000);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
