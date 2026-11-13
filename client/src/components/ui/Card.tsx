import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface shadow-card', className)}
      {...props}
    />
  );
}

/** `grip`: a `<DragHandle>` shown before the title and description (for draggable cards). */
export function CardHeader({
  className,
  grip,
  children,
  ...props
}: ComponentProps<'div'> & { grip?: ReactNode }) {
  if (grip)
    return (
      <div
        className={cn('flex items-start gap-1 border-b border-border px-5 py-4', className)}
        {...props}
      >
        <div className="-my-1 -ml-3 flex">{grip}</div>
        <div className="flex min-w-0 flex-col gap-1">{children}</div>
      </div>
    );
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-border px-5 py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-fg-muted', className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-border px-5 py-3',
        className,
      )}
      {...props}
    />
  );
}
