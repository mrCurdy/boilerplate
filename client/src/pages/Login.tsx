import { Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { AuthCard } from '@/components/auth/AuthCard';
import { Alert, Button, FormField, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          No account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="danger" title={error} />}
        <FormField label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            leftIcon={<Mail />}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label="Password" required>
          <Input
            type="password"
            autoComplete="current-password"
            leftIcon={<Lock />}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>
        <Button type="submit" block loading={pending}>
          Sign in
        </Button>
        {import.meta.env.DEV && (
          <p className="text-center text-xs text-fg-muted">
            Dev: seeded admin is <code>admin@example.com</code> / <code>admin12345</code> (see .env)
          </p>
        )}
      </form>
    </AuthCard>
  );
}
