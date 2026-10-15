import type { ServerToClientEvents } from '@app/shared';
import type { Config } from './config';
import type { Db } from './db';
import { createAuthMiddleware, type AuthMiddleware } from './auth/middleware';
import { createTokenService, type TokenService } from './auth/tokens';

/** Hooks REST routes use to talk to the realtime layer, without importing socket.io directly. */
export interface Realtime {
  stats(): { connections: number; onlineUsers: number };
  /** Ask all sockets of a user to refresh their access token (e.g. after a role change). */
  refreshUser(userId: string): void;
  /** Force-disconnect all sockets of a user (e.g. after deletion). */
  disconnectUser(userId: string): void;
  /** Emit an event to every connected socket. */
  broadcast<E extends keyof ServerToClientEvents>(
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void;
}

export interface AppContext {
  config: Config;
  db: Db;
  tokens: TokenService;
  auth: AuthMiddleware;
  realtime: Realtime;
  startedAt: number;
}

export function createContext(config: Config, db: Db): AppContext {
  const tokens = createTokenService(db, config);
  return {
    config,
    db,
    tokens,
    auth: createAuthMiddleware(tokens),
    // Replaced by the socket layer once it starts; safe no-op for tests without sockets.
    realtime: {
      stats: () => ({ connections: 0, onlineUsers: 0 }),
      refreshUser: () => {},
      disconnectUser: () => {},
      broadcast: () => {},
    },
    startedAt: Date.now(),
  };
}
