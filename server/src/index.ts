import { createServer } from 'node:http';
import { createApp } from './app';
import { loadConfig } from './config';
import { createContext } from './context';
import { createDb } from './db';
import { seedAdmin } from './db/seed';
import { logger } from './lib/logger';
import { createSocketServer } from './sockets';

async function main() {
  const config = loadConfig();
  const db = await createDb(config);
  await db.init();
  await seedAdmin(db, config);

  const ctx = createContext(config, db);
  const app = createApp(ctx);
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer, ctx);

  // Housekeeping: purge expired refresh tokens hourly.
  const cleanup = setInterval(() => db.tokens.deleteExpired().catch(() => {}), 60 * 60 * 1000);
  cleanup.unref();

  httpServer.listen(config.PORT, () => {
    logger.info(
      `Server listening on http://localhost:${config.PORT} (db: ${db.driver}, env: ${config.NODE_ENV})`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    clearInterval(cleanup);
    io.close();
    httpServer.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal(err instanceof Error ? err.message : err);
  process.exit(1);
});
