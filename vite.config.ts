import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/** Backend host. Override with API_TARGET when pointing at a different env. */
const API_TARGET = process.env.API_TARGET || 'https://api.voltava.in';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // jsx-runtime must be listed or this chunk builds empty — React is
            // only reached through it once the JSX transform is automatic.
            'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
            'lucide-react': ['lucide-react'],
            'router-vendor': ['react-router-dom'],
            // recharts is ~250 kB and used by one donut on one page.
            'charts': ['recharts']
          }
        }
      }
    },
    esbuild: {
      // `console` used to be dropped here too. Every error handler in the app is
      // routed through lib/api.ts and the ErrorBoundary, both of which log — and
      // with console stripped, a production failure left no trace anywhere: no
      // toast, no console entry, nothing to debug a client report from.
      drop: ['debugger'] as any,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Development only: production is static files on Firebase that call
      // VITE_API_URL directly. The certificate is checked unless you point
      // API_TARGET at a local backend with a self-signed one (API_TARGET_INSECURE=1).
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          secure: process.env.API_TARGET_INSECURE !== '1',
        },
        '/socket.io': {
          target: API_TARGET,
          changeOrigin: true,
          secure: process.env.API_TARGET_INSECURE !== '1',
          ws: true,
        }
      }
    },
  };
});
