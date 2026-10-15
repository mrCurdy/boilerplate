import { Router } from 'express';
import type { SystemInfo } from '@app/shared';
import type { AppContext } from '../context';

export function systemRouter({ db, auth, realtime, config, startedAt }: AppContext) {
  const r = Router();

  /** Public liveness probe (used by Docker healthcheck). */
  r.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSec: Math.round((Date.now() - startedAt) / 1000) });
  });

  /** Public, non-sensitive config the client may show (e.g. active DB driver badge). */
  r.get('/meta', (_req, res) => {
    res.json({ dbDriver: db.driver });
  });

  r.get('/info', auth.requireAuth, auth.requireRole('admin'), async (_req, res) => {
    const [users, notes, messages] = await Promise.all([
      db.users.count(),
      db.notes.count(),
      db.messages.count(),
    ]);
    const info: SystemInfo = {
      dbDriver: db.driver,
      nodeVersion: process.version,
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      env: config.NODE_ENV,
      counts: { users, notes, messages },
      sockets: realtime.stats(),
    };
    res.json(info);
  });

  return r;
}
