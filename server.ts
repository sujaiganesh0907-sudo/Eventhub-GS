import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRouter from './backend/src/routes/index';
import { seedDatabaseIfEmpty } from './backend/src/config/seed';
import { processDueReminders } from './backend/src/controllers/reminderController';

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

  // Direct any index requests straight to the web browser root
  app.get(['/index', '/index.ts', '/index.js'], (_req, res) => {
    res.redirect('/');
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
    const localUrl = `http://localhost:${PORT}`;
    console.log(`\n==================================================`);
    console.log(`  EVENTHUB Web Application is Live!`);
    console.log(`  Directing to web browser: ${localUrl}`);
    console.log(`  Network access:         http://0.0.0.0:${PORT}`);
    console.log(`==================================================\n`);

    // In local non-CI environments, attempt to automatically open default browser
    if (process.env.NODE_ENV !== 'production' && !process.env.CI && process.env.OPEN_BROWSER === 'true') {
      import('child_process').then(({ exec }) => {
        const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${cmd} ${localUrl}`, () => {});
      }).catch(() => {});
    }

    // Run reminder processor every 20 seconds
    setInterval(() => {
      processDueReminders().catch((e) => console.error('Error in reminder processor:', e));
    }, 20000);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting EVENTHUB server:', err);
});
