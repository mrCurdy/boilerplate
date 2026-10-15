import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { registerSchema } from '@app/shared';
import { AuthCard } from '@/components/auth/AuthCard';
import { Alert, Button, FormField, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, fieldErrors } from '@/lib/errors';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    // Same zod schema the server uses — instant feedback without a round-trip.
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await register(parsed.data);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <AuthCard
      title="Create an account"
      subtitle="New accounts get the 'user' role"
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {error && <Alert tone="danger" title={error} />}
        <FormField label="Name" required error={errors.name}>
          <Input autoComplete="name" value={form.name} onChange={set('name')} />
        </FormField>
        <FormField label="Email" required error={errors.email}>
          <Input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </FormField>
        <FormField label="Password" required error={errors.password} hint="At least 8 characters">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </FormField>
        <Button type="submit" block loading={pending}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
