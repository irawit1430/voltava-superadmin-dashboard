import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import compression from 'compression';

// Shared with vite.config.ts via the same env var, so dev and prod can't drift.
const TARGET_API = process.env.API_TARGET || 'https://api.voltava.in';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // --- Mock endpoints removed as backend is ready ---

  // Add compression middleware
  app.use(compression());

  // Setup Proxy for /api
  const apiProxy = createProxyMiddleware({
    target: TARGET_API,
    changeOrigin: true,
    secure: false,
  });
  
  // Use a middleware function to avoid express stripping the path
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      return apiProxy(req, res, next);
    }
    next();
  });

  // Setup Proxy for Websockets
  const wsProxy = createProxyMiddleware({
    target: TARGET_API,
    changeOrigin: true,
    ws: true,
    secure: false,
  });
  app.use('/socket.io', wsProxy);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  httpServer.on('upgrade', wsProxy.upgrade as any);
}

startServer();
