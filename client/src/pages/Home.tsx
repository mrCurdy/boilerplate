import {
  ArrowRight,
  Database,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  NotebookPen,
  Palette,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router';
import type { Role } from '@app/shared';
import { roleTone } from '@/components/layout/AppShell';
import { Badge, Card, CardBody } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Feature {
  to: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  minRole?: Role;
}

const FEATURES: Feature[] = [
  {
    to: '/ui',
    title: 'UI Kit',
    description: 'Every reusable component, variant and design token, in light and dark.',
    icon: Palette,
  },
  {
    to: '/appearance',
    title: 'Appearance',
    description:
      'Live-tune brand color, fonts, radius, density and shadows; admins publish a site default.',
    icon: SlidersHorizontal,
  },
  {
    to: '/notes',
    title: 'Notes (CRUD)',
    description: 'REST API + zod validation, persisted with whichever DB driver is active.',
    icon: NotebookPen,
    minRole: 'user',
  },
  {
    to: '/chat',
    title: 'Realtime chat',
    description: 'Socket.io rooms, message history, typing indicators and presence.',
    icon: MessagesSquare,
    minRole: 'user',
  },
  {
    to: '/moderation',
    title: 'Moderation',
    description: 'Moderators can view and remove any note.',
    icon: Shield,
    minRole: 'moderator',
  },
  {
    to: '/admin',
    title: 'Admin dashboard',
    description: 'Manage users and roles, live socket stats, system info.',
    icon: LayoutDashboard,
    minRole: 'admin',
  },
  {
    to: '/profile',
    title: 'Profile & tokens',
    description: 'Inspect your JWT claims, expiry and refresh flow.',
    icon: KeyRound,
    minRole: 'user',
  },
];

export default function Home() {
  const { user } = useAuth();
  const [dbDriver, setDbDriver] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ dbDriver: string }>('/meta').then(
      (m) => setDbDriver(m.dbDriver),
      () => {},
    );
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-gradient-to-br from-primary-soft via-surface to-surface p-8">
        <Badge tone="primary" className="mb-4">
          React · Tailwind · Express · Socket.io
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Full-stack boilerplate
        </h1>
        <p className="mt-3 max-w-2xl text-fg-muted">
          A starting point for new web apps: typed end-to-end, a token-driven style system, JWT auth
          with roles, realtime events, and a storage layer that switches between JSON, SQLite and
          PostgreSQL with one env var.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-fg-muted">
            <Database className="h-4 w-4" /> Active DB driver:
            <Badge tone="info">{dbDriver ?? '…'}</Badge>
          </span>
          {user ? (
            <span className="inline-flex items-center gap-2 text-fg-muted">
              Signed in as <strong className="text-fg">{user.name}</strong>
              <Badge tone={roleTone[user.role]}>{user.role}</Badge>
            </span>
          ) : (
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in to unlock everything →
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ to, title, description, icon: Icon, minRole }) => (
          <Link key={to} to={to} className="group focus-ring rounded-lg">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-primary-soft p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  {minRole && (
                    <Badge tone={roleTone[minRole]}>
                      {minRole === 'user' ? 'signed in' : `${minRole}+`}
                    </Badge>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-fg-muted">{description}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open{' '}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
