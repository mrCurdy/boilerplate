import { CHAT_ROOMS, chatMessageSchema } from '@app/shared';
import type { AppContext } from '../context';
import { logger } from '../lib/logger';
import type { AppSocket, IO } from './types';

const HISTORY_LIMIT = 50;
const chatRoom = (room: string) => `chat:${room}`;
const isRoom = (room: unknown): room is string =>
  CHAT_ROOMS.includes(room as (typeof CHAT_ROOMS)[number]);

export function registerChat(io: IO, socket: AppSocket, { db }: AppContext) {
  const { user } = socket.data;
  const me = { id: user.sub, name: user.name, role: user.role };

  socket.on('chat:join', async (room, ack) => {
    if (!isRoom(room)) return ack?.({ ok: false, error: 'Unknown room' });
    await socket.join(chatRoom(room));
    socket.emit('chat:history', {
      room,
      messages: await db.messages.listRecent(room, HISTORY_LIMIT),
    });
    ack?.({ ok: true });
  });

  socket.on('chat:leave', (room) => {
    if (isRoom(room)) socket.leave(chatRoom(room));
  });

  socket.on('chat:send', async (payload, ack) => {
    const parsed = chatMessageSchema.safeParse(payload);
    if (!parsed.success || !isRoom(parsed.data.room))
      return ack?.({ ok: false, error: 'Invalid message' });
    if (!socket.rooms.has(chatRoom(parsed.data.room)))
      return ack?.({ ok: false, error: 'Join the room first' });
    try {
      const msg = await db.messages.create({ ...parsed.data, userId: me.id, userName: me.name });
      io.to(chatRoom(msg.room)).emit('chat:message', msg);
      ack?.({ ok: true, data: msg });
    } catch (err) {
      logger.error({ err }, 'chat:send failed');
      ack?.({ ok: false, error: 'Failed to send' });
    }
  });

  socket.on('chat:typing', ({ room, typing }) => {
    if (isRoom(room))
      socket.to(chatRoom(room)).emit('chat:typing', { room, user: me, typing: !!typing });
  });
}
