import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload, ClientToServerEvents, ServerToClientEvents } from '@app/shared';

export interface SocketData {
  user: AccessTokenPayload;
}

export type IO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/** Room every socket of a given user joins — lets us target "all tabs of user X". */
export const userRoom = (userId: string) => `user:${userId}`;
/** Admins join this room to receive live system stats. */
export const ADMIN_ROOM = 'role:admin';
