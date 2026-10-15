import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AccessTokenPayload, PublicUser } from '@app/shared';
import { durationToMs, type Config } from '../config';
import type { Db, UserRecord } from '../db';
import { HttpError } from '../lib/errors';

export const REFRESH_COOKIE = 'refresh_token';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export const toPublicUser = ({ passwordHash: _ph, ...u }: UserRecord): PublicUser => u;

/**
 * Access tokens: short-lived JWTs sent as `Authorization: Bearer`.
 * Refresh tokens: opaque random strings in an httpOnly cookie, stored hashed,
 * rotated on every use. Presenting an already-rotated token revokes its whole family
 * (a strong signal the token was stolen).
 */
export function createTokenService(db: Db, config: Config) {
  const refreshTtlMs = durationToMs(config.REFRESH_TOKEN_TTL);

  function signAccess(user: Pick<UserRecord, 'id' | 'role' | 'name'>): string {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role, name: user.name };
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    });
  }

  function verifyAccess(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      throw HttpError.unauthorized('Invalid or expired access token');
    }
  }

  async function issueRefresh(userId: string, familyId: string = randomUUID()) {
    // Opaque token, HMAC'd with the refresh secret so a DB leak alone can't forge lookups.
    const token = randomBytes(48).toString('base64url');
    await db.tokens.create({
      userId,
      familyId,
      tokenHash: sha256(`${config.JWT_REFRESH_SECRET}:${token}`),
      expiresAt: new Date(Date.now() + refreshTtlMs).toISOString(),
    });
    return token;
  }

  /** Validates + rotates a refresh token. Returns the user and a fresh token pair. */
  async function rotate(token: string) {
    const record = await db.tokens.findByHash(sha256(`${config.JWT_REFRESH_SECRET}:${token}`));
    if (!record) throw HttpError.unauthorized('Invalid refresh token');

    if (record.revokedAt) {
      await db.tokens.revokeFamily(record.familyId);
      throw HttpError.unauthorized('Refresh token reuse detected; session revoked');
    }
    if (record.expiresAt <= new Date().toISOString()) {
      await db.tokens.revoke(record.id);
      throw HttpError.unauthorized('Refresh token expired');
    }

    const user = await db.users.findById(record.userId);
    if (!user) throw HttpError.unauthorized('User no longer exists');

    await db.tokens.revoke(record.id);
    const refreshToken = await issueRefresh(user.id, record.familyId);
    return { user, accessToken: signAccess(user), refreshToken };
  }

  async function revoke(token: string) {
    const record = await db.tokens.findByHash(sha256(`${config.JWT_REFRESH_SECRET}:${token}`));
    if (record) await db.tokens.revoke(record.id);
  }

  const cookieOptions = {
    httpOnly: true,
    secure: config.httpsOnly,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: refreshTtlMs,
  };

  return { signAccess, verifyAccess, issueRefresh, rotate, revoke, cookieOptions };
}

export type TokenService = ReturnType<typeof createTokenService>;
