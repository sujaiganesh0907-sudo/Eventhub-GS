import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from backend/.env and root .env BEFORE importing backend modules
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  const pArgIndex = process.argv.indexOf('-p');
  if (pArgIndex !== -1 && process.argv[pArgIndex + 1]) {
    const val = parseInt(process.argv[pArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.APP_PORT) {
    const val = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  // If PORT is 8080 (Cloud Run container port used by Nginx), run app on default port 3000
  if (process.env.PORT && process.env.PORT !== '8080') {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 3000;
}

function resolveHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Dynamic backend imports so that Cloudinary, MongoDB, and other modules see loaded env variables
  const { connectToMongo, isMongoConnected } = await import('./backend/src/config/db');
  const { seedDatabaseIfEmpty } = await import('./backend/src/config/seed');
  const { default: apiRouter } = await import('./backend/src/routes/index');
  const { processDueReminders } = await import('./backend/src/controllers/reminderController');
  const { isCloudinaryConfigured } = await import('./backend/src/services/cloudinaryService');

  // Initialize MongoDB Atlas connection (eventhub_db)
  await connectToMongo();

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
    res.json({
      status: 'ok',
      service: 'EVENTHUB Full-Stack Engine',
      database: isMongoConnected() ? 'MongoDB Atlas (eventhub_db)' : 'Embedded Engine Fallback',
      cloudinary: isCloudinaryConfigured ? 'Configured & Active' : 'Local Storage Fallback Mode',
      time: new Date().toISOString(),
    });
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
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = resolvePort();
  const HOST = resolveHost();

  app.listen(PORT, HOST, () => {
    console.log(`\n==================================================`);
    console.log(`  EVENTHUB Web Application is Live!`);
    console.log(`  Listening on http://${HOST}:${PORT}`);
    console.log(`  Database Status:        ${isMongoConnected() ? 'MongoDB Atlas (eventhub_db)' : 'Embedded Engine Fallback'}`);
    console.log(`  Cloudinary Status:      ${isCloudinaryConfigured ? 'Cloudinary Storage' : 'Local Static Fallback'}`);
    console.log(`==================================================\n`);

    // Run reminder processor every 20 seconds
    setInterval(() => {
      processDueReminders().catch((e) => console.error('Error in reminder processor:', e));
    }, 20000);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting EVENTHUB server:', err);
});
