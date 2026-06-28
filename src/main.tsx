import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootstrapApp } from './app/bootstrap';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

void bootstrapApp().catch((error) => {
  console.error('App bootstrap failed', error);
});
