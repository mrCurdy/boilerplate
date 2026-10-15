import bcrypt from 'bcryptjs';
import { Router, type Response } from 'express';
import {
  loginSchema,
  registerSchema,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
} from '@app/shared';
import type { AppContext } from '../context';
import type { UserRecord } from '../db';
import { REFRESH_COOKIE, toPublicUser } from '../auth/tokens';
import { HttpError } from '../lib/errors';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';

// Pre-computed hash so login takes similar time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', 10);

export function authRouter({ db, tokens, auth }: AppContext) {
  const r = Router();

  const sendSession = async (res: Response, user: UserRecord, status = 200) => {
    const refreshToken = await tokens.issueRefresh(user.id);
    res.cookie(REFRESH_COOKIE, refreshToken, tokens.cookieOptions);
    const body: AuthResponse = { user: toPublicUser(user), accessToken: tokens.signAccess(user) };
    res.status(status).json(body);
  };

  r.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
    const { email, name, password } = req.body as RegisterInput;
    if (await db.users.findByEmail(email)) throw HttpError.conflict('Email already registered');
    // If no admin was seeded, the very first account becomes admin.
    const role = (await db.users.count()) === 0 ? 'admin' : 'user';
    const user = await db.users.create({
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    });
    await sendSession(res, user, 201);
  });

  r.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
    const { email, password } = req.body as LoginInput;
    const user = await db.users.findByEmail(email);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw HttpError.unauthorized('Invalid email or password');
    await sendSession(res, user);
  });

  r.post('/refresh', async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw HttpError.unauthorized('No refresh token');
    try {
      const { user, accessToken, refreshToken } = await tokens.rotate(token);
      res.cookie(REFRESH_COOKIE, refreshToken, tokens.cookieOptions);
      const body: AuthResponse = { user: toPublicUser(user), accessToken };
      res.json(body);
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, { ...tokens.cookieOptions, maxAge: undefined });
      throw err;
    }
  });

  r.post('/logout', async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) await tokens.revoke(token);
    res.clearCookie(REFRESH_COOKIE, { ...tokens.cookieOptions, maxAge: undefined });
    res.status(204).end();
  });

  r.post('/logout-all', auth.requireAuth, async (req, res) => {
    await db.tokens.revokeAllForUser(req.auth!.sub);
    res.clearCookie(REFRESH_COOKIE, { ...tokens.cookieOptions, maxAge: undefined });
    res.status(204).end();
  });

  r.get('/me', auth.requireAuth, async (req, res) => {
    const user = await db.users.findById(req.auth!.sub);
    if (!user) throw HttpError.unauthorized('User no longer exists');
    res.json({ user: toPublicUser(user) });
  });

  return r;
}
