import path from 'node:path';
import fs from 'node:fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { AppConfig } from './config.js';
import type { Store } from './store/types.js';
import { HttpError } from './errors.js';
import { authRouter } from './routes/auth.js';
import { boardsRouter } from './routes/boards.js';
import { miscRouter } from './routes/misc.js';
import { devRouter } from './routes/dev.js';
import type { BoardHub } from './services/hub.js';
import type { BoardStateManager } from './services/boardState.js';

export interface AppDeps {
  store: Store;
  config: AppConfig;
  hub: BoardHub;
  state: BoardStateManager;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          workerSrc: ["'self'", 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const origins = new Set(deps.config.corsOrigins);
  app.use(
    '/api',
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter(deps));
  app.use('/api/boards', boardsRouter(deps));
  app.use('/api/dev', devRouter(deps));
  app.use('/api', miscRouter(deps));

  const dist = deps.config.clientDist ? path.resolve(deps.config.clientDist) : null;
  if (dist && fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    // SPA: każda nieznana ścieżka GET (poza /api i /ws) zwraca index.html
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, details: err.details });
      return;
    }
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Rekord już istnieje' });
      return;
    }
    if ((err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Nieprawidłowy JSON' });
      return;
    }
    console.error('[api] błąd', err);
    res.status(500).json({ error: 'Błąd serwera' });
  });

  return app;
}
