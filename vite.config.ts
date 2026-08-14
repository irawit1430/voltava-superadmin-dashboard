import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

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
            'react-vendor': ['react', 'react-dom'],
            'lucide-react': ['lucide-react'],
            'router-vendor': ['react-router-dom']
          }
        }
      }
    },
    esbuild: {
      drop: ['console', 'debugger'] as any,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'https://gps-backend-jzd7.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'https://gps-backend-jzd7.onrender.com',
          changeOrigin: true,
          secure: false,
          ws: true,
        }
      }
    },
  };
});
