import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeShareService } from './services/share.service';

const container = document.getElementById('root');
const root = createRoot(container!);

const initializeApp = async (): Promise<void> => {
  await initializeShareService();
};

initializeApp().catch((error) => {
  console.warn('Share service initialization failed', error);
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);