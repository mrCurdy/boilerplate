import type { RequestHandler } from 'express';
import { hasRole, type AccessTokenPayload, type Role } from '@app/shared';
import { HttpError } from '../lib/errors';
import type { TokenService } from './tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function createAuthMiddleware(tokens: TokenService) {
  /** Requires a valid access token; populates `req.auth`. */
  const requireAuth: RequestHandler = (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw HttpError.unauthorized('Missing access token');
    req.auth = tokens.verifyAccess(header.slice(7));
    next();
  };

  /** Requires the caller's role to be at least `min` (see ROLES order). Use after requireAuth. */
  const requireRole =
    (min: Role): RequestHandler =>
    (req, _res, next) => {
      if (!req.auth) throw HttpError.unauthorized();
      if (!hasRole(req.auth.role, min)) throw HttpError.forbidden(`Requires role: ${min}`);
      next();
    };

  return { requireAuth, requireRole };
}

export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
