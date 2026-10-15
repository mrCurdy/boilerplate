import { LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROLES } from '@app/shared';
import { roleTone } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, getAccessToken, refreshSession } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

/** Decode (not verify!) a JWT payload for display. */
const decodeJwt = (token: string | null) => {
  try {
    return token
      ? (JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
          string,
          unknown
        >)
      : null;
  } catch {
    return null;
  }
};

export default function Profile() {
  const { user, logout, hasRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [claims, setClaims] = useState(() => decodeJwt(getAccessToken()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;
  const exp = typeof claims?.exp === 'number' ? claims.exp * 1000 : null;
  const secondsLeft = exp ? Math.max(0, Math.round((exp - now) / 1000)) : null;

  const refresh = async () => {
    const s = await refreshSession();
    setClaims(decodeJwt(s?.accessToken ?? null));
    if (s) toast.success('Token refreshed', 'Refresh token was rotated too.');
  };

  const logoutAll = async () => {
    await api.post('/auth/logout-all');
    await logout();
    navigate('/login');
  };

  return (
    <>
      <PageHeader title="Profile" description="Your account and current session." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardBody className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{user.name}</span>
              <span className="text-sm text-fg-muted">{user.email}</span>
              <span className="text-xs text-fg-muted">
                Member since {formatDateTime(user.createdAt)}
              </span>
            </div>
          </CardBody>
          <CardBody className="border-t border-border">
            <p className="mb-2 text-sm font-medium">Role hierarchy</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Badge key={r} tone={hasRole(r) ? roleTone[r] : 'neutral'} outline={!hasRole(r)}>
                  {r} {hasRole(r) ? '✓' : ''}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access token</CardTitle>
            <CardDescription>
              Short-lived JWT held in memory. The refresh token lives in an httpOnly cookie and is
              rotated on each use.
            </CardDescription>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Expires in</span>
              <Badge tone={secondsLeft !== null && secondsLeft < 60 ? 'warning' : 'success'}>
                {secondsLeft !== null
                  ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`
                  : '—'}
              </Badge>
            </div>
            <pre className="overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs scrollbar-thin">
              {JSON.stringify(claims, null, 2)}
            </pre>
          </CardBody>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={refresh}
            >
              Refresh now
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={logoutAll}
            >
              Sign out everywhere
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
