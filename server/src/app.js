import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthRouter } from './routes/health.js';
import { HttpError, notFound, errorHandler } from './middleware/errors.js';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.webm', '.mp4', '.pdf', '.woff', '.woff2']);

function publicFiles(directory, extensions) {
  const router = express.Router();
  router.use((req, res, next) => {
    if (!extensions.has(path.extname(req.path).toLowerCase())) return next(new HttpError(404, 'NOT_FOUND', 'Berkas tidak ditemukan.'));
    next();
  });
  router.use(express.static(path.join(projectRoot, directory), {
    dotfiles: 'deny',
    index: false,
    fallthrough: false,
    maxAge: 0
  }));
  return router;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.enable('case sensitive routing');
  app.enable('strict routing');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  }, express.json({ limit: '100kb' }), healthRouter, notFound);

  // Only public frontend files are served. The repository root contains backend/config files.
  const entryFiles = { '/': 'index.html', '/index.html': 'index.html', '/script.js': 'script.js', '/style.css': 'style.css' };
  app.get(Object.keys(entryFiles), (req, res, next) => {
    res.sendFile(path.join(projectRoot, entryFiles[req.path]), error => { if (error) next(error); });
  });
  app.use('/js', publicFiles('js', new Set(['.js'])));
  app.use('/assets', publicFiles('assets', mediaExtensions));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
