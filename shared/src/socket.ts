import type { Appearance } from './appearance';
import type { ChatMessage, OnlineUser } from './types';

/** Events emitted by the server. Keep both maps in sync with server/src/sockets. */
export interface ServerToClientEvents {
  'chat:message': (msg: ChatMessage) => void;
  'chat:history': (payload: { room: string; messages: ChatMessage[] }) => void;
  'chat:typing': (payload: { room: string; user: OnlineUser; typing: boolean }) => void;
  'presence:list': (users: OnlineUser[]) => void;
  'system:stats': (stats: { connections: number; onlineUsers: number }) => void;
  /** Session changed server-side (e.g. role updated): client should refresh its access token. */
  'auth:refresh': () => void;
  /** Site-wide appearance default changed by an admin. */
  'settings:appearance': (appearance: Appearance | null) => void;
}

export type Ack<T = undefined> = (
  res: { ok: true; data?: T } | { ok: false; error: string },
) => void;

/** Events emitted by the client. */
export interface ClientToServerEvents {
  'chat:join': (room: string, ack?: Ack) => void;
  'chat:leave': (room: string) => void;
  'chat:send': (payload: { room: string; text: string }, ack?: Ack<ChatMessage>) => void;
  'chat:typing': (payload: { room: string; typing: boolean }) => void;
  'presence:get': (ack: (users: OnlineUser[]) => void) => void;
}
