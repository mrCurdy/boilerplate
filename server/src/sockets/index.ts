import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { AppContext } from '../context';
import { logger } from '../lib/logger';
import { registerChat } from './chat';
import { createPresence } from './presence';
import { ADMIN_ROOM, userRoom, type IO } from './types';

export type { IO } from './types';

export function createSocketServer(httpServer: HttpServer, ctx: AppContext): IO {
  const io: IO = new Server(httpServer, {
    cors: { origin: ctx.config.CLIENT_URL.split(','), credentials: true },
  });

  // Handshake auth: client passes `auth: { token }` with its access JWT.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      socket.data.user = ctx.tokens.verifyAccess(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  const presence = createPresence(io);

  io.on('connection', (socket) => {
    const { user } = socket.data;
    logger.debug({ userId: user.sub, socketId: socket.id }, 'socket connected');
    socket.join(userRoom(user.sub));
    if (user.role === 'admin') socket.join(ADMIN_ROOM);

    presence.onConnect(socket);
    registerChat(io, socket, ctx);
    // Register additional feature handlers here.

    socket.on('disconnect', () => presence.onDisconnect(socket));
  });

  ctx.realtime = {
    stats: presence.stats,
    refreshUser: (userId) => io.to(userRoom(userId)).emit('auth:refresh'),
    disconnectUser: (userId) => io.in(userRoom(userId)).disconnectSockets(true),
    broadcast: (event, ...args) => io.emit(event, ...args),
  };

  return io;
}
