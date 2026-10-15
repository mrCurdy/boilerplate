import type { ApiErrorBody, AuthResponse } from '@app/shared';

/**
 * Fetch wrapper for the Express API.
 * - Access token is kept in memory only (not localStorage) to limit XSS exposure.
 * - On 401 it calls /auth/refresh once (httpOnly cookie) and retries the request.
 * - Concurrent 401s share a single in-flight refresh.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;
const listeners = new Set<(session: AuthResponse | null) => void>();

export const getAccessToken = () => accessToken;

/** Subscribe to session changes caused by refreshes/expiry (used by AuthContext). */
export function onSessionChange(fn: (session: AuthResponse | null) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function setSession(session: AuthResponse | null) {
  accessToken = session?.accessToken ?? null;
  listeners.forEach((fn) => fn(session));
}

/** Exchange the refresh cookie for a new access token. Returns null if the session is gone. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshPromise ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (res) => (res.ok ? ((await res.json()) as AuthResponse) : null))
    .catch(() => null)
    .then((session) => {
      setSession(session);
      return session;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown; skipRefresh?: boolean };

async function request<T>(
  path: string,
  { body, skipRefresh, headers, ...init }: Options = {},
): Promise<T> {
  const doFetch = () =>
    fetch(`/api${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();
  if (res.status === 401 && !skipRefresh && accessToken) {
    if (await refreshSession()) res = await doFetch();
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as Partial<ApiErrorBody>).error;
    throw new ApiError(
      res.status,
      err?.message ?? res.statusText,
      err?.code ?? 'ERROR',
      err?.details,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T = void>(path: string, opts?: Options) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
