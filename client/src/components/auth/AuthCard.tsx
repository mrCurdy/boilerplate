import { Boxes } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardBody } from '@/components/ui';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-fg shadow-card">
            <Boxes className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
          </div>
        </div>
        <Card>
          <CardBody className="py-6">{children}</CardBody>
        </Card>
        <p className="mt-4 text-center text-sm text-fg-muted">{footer}</p>
      </div>
    </div>
  );
}
