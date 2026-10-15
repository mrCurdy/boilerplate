import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { Role } from '@app/shared';
import { Badge, buttonVariants, EmptyState } from '@/components/ui';

export default function Forbidden({ required }: { required?: Role }) {
  return (
    <EmptyState
      className="py-24"
      icon={<ShieldAlert />}
      title="403 — Access denied"
      description={
        <>
          This page requires the {required ? <Badge tone="primary">{required}</Badge> : 'a higher'}{' '}
          role or above.
        </>
      }
      action={
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Go home
        </Link>
      }
    />
  );
}
