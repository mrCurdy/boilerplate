import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { mockApi, unauthorized } from '@/test/fetch';
import Login from './Login';

// No real socket in jsdom; AuthContext connects it after login.
vi.mock('@/lib/socket', () => ({ socket: { connected: false, connect() {}, disconnect() {} } }));

afterEach(() => vi.unstubAllGlobals());

const user = { id: 'u1', email: 'a@b.c', name: 'Ann', role: 'user', createdAt: '' };
const session = { status: 200, body: { user, accessToken: 'tok-1' } };

const app = () =>
  render(
    <AuthProvider>
      <RouterProvider
        router={createMemoryRouter(
          [
            { path: '/login', element: <Login /> },
            { path: '/', element: <p>Inside the app</p> },
          ],
          { initialEntries: ['/login'] },
        )}
      />
    </AuthProvider>,
  );

const signIn = async (password: string) => {
  await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.c');
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('Login', () => {
  it('signs in, then sends the access token as a bearer header', async () => {
    const fetch = mockApi((method, path, body, headers) => {
      if (path === '/auth/refresh') return unauthorized; // no cookie yet
      if (method === 'POST' && path === '/auth/login') {
        expect(body).toEqual({ email: 'a@b.c', password: 'secret123' });
        return session;
      }
      if (path === '/notes')
        return headers.get('Authorization') === 'Bearer tok-1'
          ? { status: 200, body: { notes: [] } }
          : unauthorized;
    });
    app();
    await signIn('secret123');
    expect(await screen.findByText('Inside the app')).toBeInTheDocument();
    await expect(api.get('/notes')).resolves.toEqual({ notes: [] });
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  it('shows the server message on a wrong password and stays on the form', async () => {
    mockApi((method, path) => {
      if (path === '/auth/refresh') return unauthorized;
      if (method === 'POST' && path === '/auth/login')
        return {
          status: 401,
          body: { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
        };
    });
    app();
    await signIn('wrong');
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText('Inside the app')).not.toBeInTheDocument();
  });

  it('skips the form when the refresh cookie still holds a session', async () => {
    mockApi((_method, path) => (path === '/auth/refresh' ? session : undefined));
    app();
    expect(await screen.findByText('Inside the app')).toBeInTheDocument();
  });
});
