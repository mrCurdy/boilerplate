import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants, EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <EmptyState
      className="py-24"
      icon={<Compass />}
      title="404 — Page not found"
      description="The page you're looking for doesn't exist or was moved."
      action={
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Go home
        </Link>
      }
    />
  );
}
