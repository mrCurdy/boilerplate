import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@app/shared';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import Forbidden from '@/pages/Forbidden';

/**
 * Route guard. Unauthenticated users go to /login (and come back after);
 * authenticated users below `minRole` see a 403 page.
 * Note: this is UX only — the API enforces the same rules server-side.
 */
export function ProtectedRoute({ minRole, children }: { minRole?: Role; children?: ReactNode }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-fg-muted">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (minRole && !hasRole(minRole)) return <Forbidden required={minRole} />;
  return children ?? <Outlet />;
}

/** Renders children only when the user has at least `minRole`. For hiding buttons/sections. */
export function RoleGate({
  minRole,
  children,
  fallback = null,
}: {
  minRole: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole } = useAuth();
  return hasRole(minRole) ? children : fallback;
}
