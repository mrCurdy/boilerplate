import {
  Activity,
  Clock,
  Database,
  MessageSquare,
  NotebookPen,
  Server,
  Trash2,
  Users,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ROLES, type PublicUser, type Role, type SystemInfo } from '@app/shared';
import { roleTone } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSocketEvent } from '@/hooks/useSocket';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatDuration } from '@/lib/format';

function Stat({
  icon: Icon,
  label,
  value,
  live,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  live?: boolean;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className="rounded-md bg-primary-soft p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            {label}
            {live && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" title="live" />
            )}
          </p>
          <p className="truncate text-xl font-semibold">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function Admin() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<PublicUser | null>(null);

  useEffect(() => {
    Promise.all([api.get<SystemInfo>('/info'), api.get<{ users: PublicUser[] }>('/users')]).then(
      ([i, u]) => {
        setInfo(i);
        setUsers(u.users);
      },
      (err) => toast.error('Failed to load admin data', errorMessage(err)),
    );
  }, [toast]);

  // Live socket stats pushed to the admin room.
  useSocketEvent(
    'system:stats',
    useCallback(
      (sockets: SystemInfo['sockets']) => setInfo((i) => (i ? { ...i, sockets } : i)),
      [],
    ),
  );

  const changeRole = async (u: PublicUser, role: Role) => {
    try {
      const { user } = await api.patch<{ user: PublicUser }>(`/users/${u.id}/role`, { role });
      setUsers((us) => us?.map((x) => (x.id === user.id ? user : x)) ?? null);
      toast.success(
        'Role updated',
        `${user.name} is now ${user.role}. Their open sessions refresh automatically.`,
      );
    } catch (err) {
      toast.error('Could not change role', errorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/users/${deleting.id}`);
      setUsers((us) => us?.filter((x) => x.id !== deleting.id) ?? null);
      toast.success('User deleted');
    } catch (err) {
      toast.error('Could not delete user', errorMessage(err));
    }
  };

  const q = query.trim().toLowerCase();
  const filtered =
    users?.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q)) ?? [];

  return (
    <>
      <PageHeader title="Admin" description="Admin-only: users, roles and system status." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {info ? (
          <>
            <Stat icon={Database} label="DB driver" value={info.dbDriver} />
            <Stat icon={Users} label="Users" value={info.counts.users} />
            <Stat icon={Wifi} label="Online users" value={info.sockets.onlineUsers} live />
            <Stat
              icon={Activity}
              label="Socket connections"
              value={info.sockets.connections}
              live
            />
            <Stat icon={NotebookPen} label="Notes" value={info.counts.notes} />
            <Stat icon={MessageSquare} label="Chat messages" value={info.counts.messages} />
            <Stat icon={Clock} label="Uptime" value={formatDuration(info.uptimeSec)} />
            <Stat icon={Server} label="Runtime" value={`Node ${info.nodeVersion} · ${info.env}`} />
          </>
        ) : (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[74px]" />)
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Users</CardTitle>
          <Input
            className="max-w-60"
            placeholder="Filter by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <Table>
          <THead>
            <Tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th className="hidden md:table-cell">Joined</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {users === null &&
              Array.from({ length: 3 }, (_, i) => (
                <Tr key={i}>
                  <Td colSpan={4}>
                    <Skeleton className="h-6" />
                  </Td>
                </Tr>
              ))}
            {filtered.map((u) => {
              const self = u.id === me?.id;
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {u.name} {self && <Badge className="ml-1">you</Badge>}
                        </p>
                        <p className="truncate text-xs text-fg-muted">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {self ? (
                      <Badge tone={roleTone[u.role]}>{u.role}</Badge>
                    ) : (
                      <Select
                        aria-label={`Role for ${u.name}`}
                        className="w-36"
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        options={ROLES.map((r) => ({ value: r, label: r }))}
                      />
                    )}
                  </Td>
                  <Td className="hidden text-fg-muted md:table-cell">
                    {formatDateTime(u.createdAt)}
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger"
                      aria-label={`Delete ${u.name}`}
                      disabled={self}
                      onClick={() => setDeleting(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete user?"
        description={
          deleting
            ? `${deleting.name} (${deleting.email}) and all their notes will be removed. Active sessions are disconnected.`
            : undefined
        }
        confirmLabel="Delete user"
      />
    </>
  );
}
