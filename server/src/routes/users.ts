import { Router } from 'express';
import { updateRoleSchema, type UpdateRoleInput } from '@app/shared';
import type { AppContext } from '../context';
import { toPublicUser } from '../auth/tokens';
import { HttpError } from '../lib/errors';
import { validateBody } from '../middleware/validate';

export function usersRouter({ db, auth, realtime }: AppContext) {
  const r = Router();
  r.use(auth.requireAuth);

  // Moderators can see the user list; only admins can change it.
  r.get('/', auth.requireRole('moderator'), async (_req, res) => {
    res.json({ users: (await db.users.list()).map(toPublicUser) });
  });

  r.patch(
    '/:id/role',
    auth.requireRole('admin'),
    validateBody(updateRoleSchema),
    async (req, res) => {
      const id = req.params.id as string;
      if (id === req.auth!.sub) throw HttpError.badRequest('You cannot change your own role');
      const user = await db.users.updateRole(id, (req.body as UpdateRoleInput).role);
      if (!user) throw HttpError.notFound('User not found');
      realtime.refreshUser(user.id);
      res.json({ user: toPublicUser(user) });
    },
  );

  r.delete('/:id', auth.requireRole('admin'), async (req, res) => {
    const id = req.params.id as string;
    if (id === req.auth!.sub) throw HttpError.badRequest('You cannot delete yourself');
    if (!(await db.users.delete(id))) throw HttpError.notFound('User not found');
    realtime.disconnectUser(id);
    res.status(204).end();
  });

  return r;
}
