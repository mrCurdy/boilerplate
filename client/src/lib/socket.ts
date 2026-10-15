import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@app/shared';
import { getAccessToken, refreshSession } from './api';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * One shared socket for the whole app. `auth` is a callback, so every (re)connect
 * sends the current access token. If the server rejects it, refresh and retry.
 */
export const socket: AppSocket = io({
  autoConnect: false,
  auth: (cb) => cb({ token: getAccessToken() }),
});

socket.on('connect_error', async (err) => {
  if (err.message !== 'unauthorized') return;
  if (await refreshSession()) socket.connect();
});

// Server asks us to pick up changed claims (e.g. role change by an admin).
socket.on('auth:refresh', async () => {
  if (await refreshSession()) {
    socket.disconnect().connect();
  }
});
