import { useEffect, useState } from 'react';
import type { ServerToClientEvents } from '@app/shared';
import { socket } from '@/lib/socket';

/**
 * Subscribe to a typed server event for the lifetime of the component.
 * Wrap `handler` in useCallback (or accept re-subscribing on each render).
 */
export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
) {
  useEffect(() => {
    // socket.io's typed overloads don't accept a generic event key; the cast is safe here.
    const s = socket as unknown as {
      on(e: string, h: unknown): void;
      off(e: string, h: unknown): void;
    };
    s.on(event, handler);
    return () => s.off(event, handler);
  }, [event, handler]);
}

/** Live connection status of the shared socket. */
export function useConnectionStatus() {
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, []);
  return connected;
}
