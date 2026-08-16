import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The global `window.fetch` monkeypatch that used to live here has been removed.
// Auth headers, 401 handling and error normalisation now live in src/lib/api.ts,
// which every call site goes through. Patching the global was invisible from the
// call sites, double-applied the Authorization header (each page set it by hand
// too), and could not be tested.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
