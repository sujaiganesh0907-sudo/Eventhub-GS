import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRouter from './backend/src/routes/index';
import { seedDatabaseIfEmpty } from './backend/src/config/seed';

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Ensure public uploads directory exists
  const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Serve static uploads
  app.use('/uploads', express.static(uploadsDir));

  // Seed database if empty
  await seedDatabaseIfEmpty();

  // API Routes
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'EVENTHUB Full-Stack Engine', time: new Date().toISOString() });
  });

  // API Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
      console.warn('[AI Studio] Database offline — returning fallback response');
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    if (req.path.startsWith('/api')) {
      console.error('Unhandled API error:', err);
      return res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
    next(err);
  });

  if (isProd) {
    // In production, serve built client from dist/
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // In dev mode, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EVENTHUB server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting EVENTHUB server:', err);
});
