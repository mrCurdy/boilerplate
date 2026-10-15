import type { OnlineUser } from '@app/shared';
import { ADMIN_ROOM, type AppSocket, type IO } from './types';

/** Tracks which users are online (a user may have several sockets/tabs). */
export function createPresence(io: IO) {
  const sockets = new Map<string, { user: OnlineUser; count: number }>();

  const list = (): OnlineUser[] => [...sockets.values()].map((v) => v.user);
  const stats = () => ({ connections: io.engine?.clientsCount ?? 0, onlineUsers: sockets.size });

  const broadcast = () => {
    io.emit('presence:list', list());
    io.to(ADMIN_ROOM).emit('system:stats', stats());
  };

  return {
    stats,
    onConnect(socket: AppSocket) {
      const { sub, name, role } = socket.data.user;
      const entry = sockets.get(sub);
      if (entry) entry.count++;
      else sockets.set(sub, { user: { id: sub, name, role }, count: 1 });
      socket.on('presence:get', (ack) => typeof ack === 'function' && ack(list()));
      broadcast();
    },
    onDisconnect(socket: AppSocket) {
      const entry = sockets.get(socket.data.user.sub);
      if (entry && --entry.count <= 0) sockets.delete(socket.data.user.sub);
      broadcast();
    },
  };
}
