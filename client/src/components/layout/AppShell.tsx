import {
  Boxes,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessagesSquare,
  NotebookPen,
  Palette,
  Shield,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import type { Role } from '@app/shared';
import { Avatar, Badge, Button, Dropdown, Tooltip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useConnectionStatus } from '@/hooks/useSocket';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** undefined = public, 'user' = any signed-in user */
  minRole?: Role;
}

/** Add pages to the sidebar here. Items are hidden when the user lacks `minRole`. */
const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/ui', label: 'UI Kit', icon: Palette },
  { to: '/appearance', label: 'Appearance', icon: SlidersHorizontal },
  { to: '/notes', label: 'Notes', icon: NotebookPen, minRole: 'user' },
  { to: '/chat', label: 'Chat', icon: MessagesSquare, minRole: 'user' },
  { to: '/moderation', label: 'Moderation', icon: Shield, minRole: 'moderator' },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard, minRole: 'admin' },
];

export const roleTone = { user: 'neutral', moderator: 'info', admin: 'primary' } as const;

export function AppShell() {
  const { user, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const connected = useConnectionStatus();

  const items = NAV.filter((i) => !i.minRole || hasRole(i.minRole));

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon, minRole }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-soft text-primary'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )
          }
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{label}</span>
          {minRole && minRole !== 'user' && <Badge tone={roleTone[minRole]}>{minRole}</Badge>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <Brand />
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-up border-r border-border bg-surface">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          {user && (
            <span
              className="hidden items-center gap-1.5 text-xs text-fg-muted sm:flex"
              title="Socket.io connection"
            >
              <span
                className={cn('h-2 w-2 rounded-full', connected ? 'bg-success' : 'bg-fg-muted')}
              />
              {connected ? 'Live' : 'Offline'}
            </span>
          )}
          <Tooltip content="Appearance" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Appearance settings"
              onClick={() => navigate('/appearance')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </Tooltip>
          <ThemeToggle />
          {user ? (
            <Dropdown
              header={
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-fg-muted">{user.email}</span>
                </div>
              }
              trigger={(props) => (
                <button
                  {...props}
                  className="focus-ring flex cursor-pointer items-center gap-2 rounded-full p-0.5"
                >
                  <Avatar name={user.name} size="sm" />
                </button>
              )}
              items={[
                { label: 'Profile', icon: <User />, onSelect: () => navigate('/profile') },
                'separator',
                {
                  label: 'Sign out',
                  icon: <LogOut />,
                  danger: true,
                  onSelect: async () => {
                    await logout();
                    navigate('/login');
                  },
                },
              ]}
            />
          ) : (
            <Button
              size="sm"
              leftIcon={<LogIn className="h-4 w-4" />}
              onClick={() => navigate('/login')}
            >
              Sign in
            </Button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <NavLink
      to="/"
      className="flex h-14 items-center gap-2 border-b border-border px-5 font-semibold md:border-b"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-fg">
        <Boxes className="h-4 w-4" />
      </span>
      Boilerplate
    </NavLink>
  );
}
