import { Router } from 'express';
import { appearanceSchema, type Appearance } from '@app/shared';
import type { AppContext } from '../context';
import { validateBody } from '../middleware/validate';

const APPEARANCE_KEY = 'appearance';

export function settingsRouter({ db, auth, realtime }: AppContext) {
  const r = Router();

  /** Site-wide appearance default (public: needed before login to theme the page). null = built-in default. */
  r.get('/appearance', async (_req, res) => {
    res.json({ appearance: await db.settings.get<Appearance>(APPEARANCE_KEY) });
  });

  r.put(
    '/appearance',
    auth.requireAuth,
    auth.requireRole('admin'),
    validateBody(appearanceSchema),
    async (req, res) => {
      const appearance = req.body as Appearance;
      await db.settings.set(APPEARANCE_KEY, appearance);
      realtime.broadcast('settings:appearance', appearance);
      res.json({ appearance });
    },
  );

  r.delete('/appearance', auth.requireAuth, auth.requireRole('admin'), async (_req, res) => {
    await db.settings.delete(APPEARANCE_KEY);
    realtime.broadcast('settings:appearance', null);
    res.status(204).end();
  });

  return r;
}
