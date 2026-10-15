import { Router, type Request } from 'express';
import {
  hasRole,
  noteCreateSchema,
  noteUpdateSchema,
  type NoteCreateInput,
  type NoteUpdateInput,
} from '@app/shared';
import type { AppContext } from '../context';
import { HttpError } from '../lib/errors';
import { validateBody } from '../middleware/validate';

export function notesRouter({ db, auth }: AppContext) {
  const r = Router();
  r.use(auth.requireAuth);

  /** Loads a note the caller may modify: the owner, or any moderator+. */
  const loadEditable = async (req: Request) => {
    const note = await db.notes.findById(req.params.id as string);
    if (!note) throw HttpError.notFound('Note not found');
    if (note.userId !== req.auth!.sub && !hasRole(req.auth!.role, 'moderator')) {
      // 404 instead of 403 so other users' note ids aren't discoverable.
      throw HttpError.notFound('Note not found');
    }
    return note;
  };

  r.get('/', async (req, res) => {
    res.json({ notes: await db.notes.listByUser(req.auth!.sub) });
  });

  r.get('/all', auth.requireRole('moderator'), async (_req, res) => {
    res.json({ notes: await db.notes.listAll() });
  });

  r.post('/', validateBody(noteCreateSchema), async (req, res) => {
    const { title, content } = req.body as NoteCreateInput;
    res
      .status(201)
      .json({ note: await db.notes.create({ userId: req.auth!.sub, title, content }) });
  });

  r.get('/:id', async (req, res) => {
    res.json({ note: await loadEditable(req) });
  });

  r.patch('/:id', validateBody(noteUpdateSchema), async (req, res) => {
    const note = await loadEditable(req);
    res.json({ note: await db.notes.update(note.id, req.body as NoteUpdateInput) });
  });

  r.delete('/:id', async (req, res) => {
    const note = await loadEditable(req);
    await db.notes.delete(note.id);
    res.status(204).end();
  });

  return r;
}
