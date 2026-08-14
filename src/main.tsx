import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor for auth
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;

  let url = '';
  if (typeof resource === 'string') {
    url = resource;
  } else if (resource instanceof URL) {
    url = resource.toString();
  } else if (resource instanceof Request) {
    url = resource.url;
  }

  if (url.startsWith('/api') || url.includes('/api/')) {
    const token = localStorage.getItem('token');
    if (token) {
      if (resource instanceof Request) {
        resource.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config = config || {};
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        };
      }
    }
  }

  try {
    const response = await originalFetch(resource, config);

    if (response.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return response;
  } catch (error) {
    throw error;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
