import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  hasRole as roleAtLeast,
  type AuthResponse,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type Role,
} from '@app/shared';
import { api, onSessionChange, refreshSession, setSession } from '@/lib/api';
import { socket } from '@/lib/socket';

interface AuthState {
  user: PublicUser | null;
  /** True until the initial silent refresh finishes. */
  loading: boolean;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  hasRole(min: Role): boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep React state in sync with token refreshes happening inside the api client.
  useEffect(
    () =>
      onSessionChange((session) => {
        setUser(session?.user ?? null);
        if (!session) socket.disconnect();
      }),
    [],
  );

  // Restore session on page load from the refresh cookie.
  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, []);

  // Realtime connection follows the auth state.
  useEffect(() => {
    if (user && !socket.connected) socket.connect();
    if (!user) socket.disconnect();
  }, [user]);

  const login = useCallback(async (input: LoginInput) => {
    setSession(await api.post<AuthResponse>('/auth/login', input, { skipRefresh: true }));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setSession(await api.post<AuthResponse>('/auth/register', input, { skipRefresh: true }));
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', undefined, { skipRefresh: true }).catch(() => {});
    setSession(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      hasRole: (min) => roleAtLeast(user?.role, min),
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
