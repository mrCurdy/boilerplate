import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppContext } from './context';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth';
import { notesRouter } from './routes/notes';
import { settingsRouter } from './routes/settings';
import { systemRouter } from './routes/system';
import { usersRouter } from './routes/users';

export function createApp(ctx: AppContext) {
  const app = express();
  const { config } = ctx;

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      hsts: config.httpsOnly,
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: config.httpsOnly ? [] : null },
      },
    }),
  );
  app.use(cors({ origin: config.CLIENT_URL.split(','), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (config.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/api/health' || !req.url?.startsWith('/api') },
        serializers: {
          req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
          res: (res: { statusCode: number }) => ({ status: res.statusCode }),
        },
      }),
    );
  }

  // ---- API ----
  const api = express.Router();
  api.use(apiLimiter);
  api.use('/', systemRouter(ctx));
  api.use('/auth', authRouter(ctx));
  api.use('/users', usersRouter(ctx));
  api.use('/notes', notesRouter(ctx));
  api.use('/settings', settingsRouter(ctx));
  // Register new feature routers here.
  api.use(notFoundHandler);
  app.use('/api', api);

  // ---- Static client (production) ----
  const clientDist = resolve(config.CLIENT_DIST ?? '../client/dist');
  if (config.NODE_ENV === 'production' && existsSync(clientDist)) {
    // Only Vite's hashed files are safe to cache forever; theme-init.js, favicon etc. are not.
    app.use(
      '/assets',
      express.static(resolve(clientDist, 'assets'), { maxAge: '1y', immutable: true }),
    );
    app.use(express.static(clientDist, { index: false }));
    // SPA fallback: every non-API GET returns index.html so client-side routing works.
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(resolve(clientDist, 'index.html'));
    });
    logger.info({ clientDist }, 'Serving client build');
  }

  app.use(errorHandler);
  return app;
}
