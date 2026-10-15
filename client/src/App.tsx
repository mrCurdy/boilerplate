import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui';
import { AppearanceProvider } from '@/context/AppearanceContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Register from '@/pages/Register';

/** Code-split a page: it is downloaded the first time its route is visited. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

/**
 * Route table. To add a page: create it in src/pages, add a route here
 * (wrapped in a ProtectedRoute with the right minRole), and add it to NAV in AppShell.
 */
const router = createBrowserRouter([
  {
    element: <AppShell />,
    // Shown while a lazy page loads on a hard refresh / direct link.
    HydrateFallback: () => (
      <div className="flex h-full items-center justify-center text-fg-muted">
        <Spinner />
      </div>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'ui', lazy: page(() => import('@/pages/UiKit')) },
      { path: 'appearance', lazy: page(() => import('@/pages/Appearance')) },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'notes', lazy: page(() => import('@/pages/Notes')) },
          { path: 'chat', lazy: page(() => import('@/pages/Chat')) },
          { path: 'profile', lazy: page(() => import('@/pages/Profile')) },
        ],
      },
      {
        element: <ProtectedRoute minRole="moderator" />,
        children: [{ path: 'moderation', lazy: page(() => import('@/pages/Moderation')) }],
      },
      {
        element: <ProtectedRoute minRole="admin" />,
        children: [{ path: 'admin', lazy: page(() => import('@/pages/Admin')) }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <AppearanceProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </AppearanceProvider>
    </ThemeProvider>
  );
}
