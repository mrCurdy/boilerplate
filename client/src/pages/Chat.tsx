import { Hash, Send, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CHAT_ROOMS, type ChatMessage, type OnlineUser } from '@app/shared';
import { roleTone } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConnectionStatus, useSocketEvent } from '@/hooks/useSocket';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { socket } from '@/lib/socket';

type Room = (typeof CHAT_ROOMS)[number];
const TYPING_TIMEOUT = 2500;

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const connected = useConnectionStatus();
  const [room, setRoom] = useState<Room>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [typing, setTyping] = useState<Record<string, OnlineUser>>({});
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingSent = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Join the room whenever it changes or the socket (re)connects; leave on cleanup.
  useEffect(() => {
    if (!connected) return;
    socket.emit('chat:join', room);
    return () => {
      socket.emit('chat:leave', room);
    };
  }, [room, connected]);

  useSocketEvent(
    'chat:history',
    useCallback(
      (p: { room: string; messages: ChatMessage[] }) => p.room === room && setMessages(p.messages),
      [room],
    ),
  );
  useSocketEvent(
    'chat:message',
    useCallback(
      (m: ChatMessage) => {
        if (m.room !== room) return;
        setMessages((ms) => [...ms, m]);
        setTyping(({ [m.userId]: _, ...rest }) => rest);
      },
      [room],
    ),
  );
  useSocketEvent(
    'chat:typing',
    useCallback(
      (p: { room: string; user: OnlineUser; typing: boolean }) => {
        if (p.room !== room) return;
        setTyping(({ [p.user.id]: _, ...rest }) =>
          p.typing ? { ...rest, [p.user.id]: p.user } : rest,
        );
      },
      [room],
    ),
  );
  useSocketEvent('presence:list', setOnline);
  useEffect(() => {
    if (connected) socket.emit('presence:get', setOnline);
  }, [connected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const switchRoom = (next: Room) => {
    if (next === room) return;
    emitTyping(false);
    setMessages([]);
    setTyping({});
    setRoom(next);
  };

  const emitTyping = (value: boolean) => {
    if (typingSent.current === value) return;
    typingSent.current = value;
    socket.emit('chat:typing', { room, typing: value });
  };

  const onChange = (value: string) => {
    setText(value);
    emitTyping(value.length > 0);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), TYPING_TIMEOUT);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    socket.emit('chat:send', { room, text: value }, (res) => {
      if (!res.ok) toast.error('Message not sent', res.error);
    });
    setText('');
    emitTyping(false);
  };

  const typingNames = Object.values(typing).map((u) => u.name);

  return (
    <>
      <PageHeader
        title="Chat"
        description="Socket.io rooms with persisted history, typing indicators and presence."
      />
      <Card className="grid h-[calc(100vh-14rem)] min-h-[420px] grid-cols-1 overflow-hidden md:grid-cols-[180px_1fr_200px]">
        {/* Rooms */}
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2 md:flex-col md:border-r md:border-b-0">
          <p className="hidden px-2 py-1 text-xs font-medium tracking-wide text-fg-muted uppercase md:block">
            Rooms
          </p>
          {CHAT_ROOMS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => switchRoom(r)}
              className={cn(
                'focus-ring flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                r === room
                  ? 'bg-primary-soft font-medium text-primary'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              <Hash className="h-3.5 w-3.5" />
              {r}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {!connected && <p className="text-center text-sm text-fg-muted">Connecting…</p>}
            {connected && messages.length === 0 && (
              <EmptyState
                icon={<Hash />}
                title={`#${room}`}
                description="No messages yet — say hello!"
              />
            )}
            <ul className="flex flex-col gap-3">
              {messages.map((m, i) => {
                const mine = m.userId === user?.id;
                const grouped = messages[i - 1]?.userId === m.userId;
                return (
                  <li
                    key={m.id}
                    className={cn('flex gap-2', mine && 'flex-row-reverse', grouped && '-mt-2')}
                  >
                    <div className="w-7 shrink-0">
                      {!grouped && <Avatar name={m.userName} size="sm" />}
                    </div>
                    <div className={cn('flex max-w-[75%] flex-col', mine && 'items-end')}>
                      {!grouped && (
                        <span className="mb-0.5 text-xs text-fg-muted">
                          {mine ? 'You' : m.userName} · {formatTime(m.createdAt)}
                        </span>
                      )}
                      <span
                        className={cn(
                          'rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap',
                          mine ? 'bg-primary text-primary-fg' : 'bg-surface-2',
                        )}
                      >
                        {m.text}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div ref={bottomRef} />
          </div>
          <div className="h-5 px-4 text-xs text-fg-muted italic">
            {typingNames.length > 0 &&
              `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…`}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <Input
              value={text}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Message #${room}`}
              maxLength={2000}
              disabled={!connected}
              aria-label="Message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!connected || !text.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Presence */}
        <div className="hidden flex-col gap-1 border-l border-border p-3 md:flex">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide text-fg-muted uppercase">
            <Users className="h-3.5 w-3.5" /> Online — {online.length}
          </p>
          {online.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm">
              <Avatar name={u.name} size="sm" online />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              {u.role !== 'user' && <Badge tone={roleTone[u.role]}>{u.role[0]}</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
