import { vi } from 'vitest';

type Reply = { status: number; body?: unknown };
type Route = (method: string, path: string, body: unknown, headers: Headers) => Reply | undefined;

/**
 * Replaces `fetch` with a fake API: `route` answers each `/api…` call (undefined = 404).
 * `headers` lets a test check e.g. the bearer token. Returns the mock, so tests can check
 * what was sent. Undo with `vi.unstubAllGlobals()` in `afterEach`.
 */
export function mockApi(route: Route) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const path = url.replace(/^\/api/, '');
    const reply = route(method, path, body, new Headers(init?.headers)) ?? { status: 404 };
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const unauthorized = {
  status: 401,
  body: { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
};
