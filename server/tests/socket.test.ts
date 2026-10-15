import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  ChatMessage,
  ClientToServerEvents,
  OnlineUser,
  ServerToClientEvents,
} from '@app/shared';
import { createSocketServer } from '../src/sockets';
import { setup, signUp, type TestEnv } from './helpers';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Socket.io', () => {
  let env: TestEnv;
  let server: Server;
  let url: string;
  const sockets: ClientSocket[] = [];

  const connect = (token?: string) =>
    new Promise<ClientSocket>((resolve, reject) => {
      const s: ClientSocket = ioClient(url, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });
      sockets.push(s);
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });

  const once = <E extends keyof ServerToClientEvents>(s: ClientSocket, event: E) =>
    new Promise<Parameters<ServerToClientEvents[E]>[0]>((resolve) =>
      (s as unknown as { once(e: string, cb: (v: unknown) => void): void }).once(
        event,
        resolve as (v: unknown) => void,
      ),
    );

  beforeAll(async () => {
    env = await setup('sqlite');
    server = createServer(env.app);
    createSocketServer(server, env.ctx);
    await new Promise<void>((r) => server.listen(0, r));
    url = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await new Promise((r) => server.close(r));
    await env.cleanup();
  });

  it('rejects connections without a valid token', async () => {
    await expect(connect()).rejects.toThrow('unauthorized');
    await expect(connect('bad-token')).rejects.toThrow('unauthorized');
  });

  it('broadcasts chat messages, typing, history and presence', async () => {
    const a = await signUp(env, 'sa@test.dev', 'Sock A');
    const b = await signUp(env, 'sb@test.dev', 'Sock B');
    const sa = await connect(a.accessToken);
    const sb = await connect(b.accessToken);

    const online = await new Promise<OnlineUser[]>((r) => sa.emit('presence:get', r));
    expect(online.map((u) => u.name)).toEqual(expect.arrayContaining(['Sock A', 'Sock B']));

    await new Promise((r) => sa.emit('chat:join', 'general', r));
    await new Promise((r) => sb.emit('chat:join', 'general', r));

    const typing = once(sb, 'chat:typing');
    sa.emit('chat:typing', { room: 'general', typing: true });
    expect(await typing).toMatchObject({ room: 'general', typing: true, user: { name: 'Sock A' } });

    const received = once(sb, 'chat:message');
    const ack = await new Promise<{ ok: boolean; data?: ChatMessage }>((r) =>
      sa.emit('chat:send', { room: 'general', text: 'hello' }, r),
    );
    expect(ack.ok).toBe(true);
    expect(await received).toMatchObject({ text: 'hello', userName: 'Sock A', room: 'general' });

    // A late joiner gets history
    const sc = await connect(a.accessToken);
    const history = once(sc, 'chat:history');
    sc.emit('chat:join', 'general');
    expect((await history).messages.at(-1)?.text).toBe('hello');
  });

  it('rejects unknown rooms and sending without joining', async () => {
    const u = await signUp(env, 'sd@test.dev', 'Sock D');
    const s = await connect(u.accessToken);
    const join = await new Promise<{ ok: boolean }>((r) => s.emit('chat:join', 'nope', r));
    expect(join.ok).toBe(false);
    const send = await new Promise<{ ok: boolean }>((r) =>
      s.emit('chat:send', { room: 'random', text: 'hi' }, r),
    );
    expect(send.ok).toBe(false);
  });

  it('broadcasts appearance changes to every connected client', async () => {
    const u = await signUp(env, 'se@test.dev', 'Sock E');
    const s = await connect(u.accessToken);
    const got = once(s, 'settings:appearance');
    const { DEFAULT_APPEARANCE } = await import('@app/shared');
    env.ctx.realtime.broadcast('settings:appearance', { ...DEFAULT_APPEARANCE, brandHue: 42 });
    expect((await got)?.brandHue).toBe(42);
  });
});
