import { GripVertical } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * The grip a row or card is dragged by. Spread the hook's `handleProps(i)` on it
 * (`useDragSort` / `useListsDragSort` in `@/lib`): pointer drag, ↑/↓ to move by one.
 * `label` names what it moves ("Move Beta"); `active` while that row is being dragged.
 */
export function DragHandle({
  label,
  active = false,
  className,
  title,
  ...props
}: ComponentProps<'button'> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={cn(
        'focus-ring flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-fg-muted select-none hover:text-fg',
        active && 'cursor-grabbing text-fg',
        className,
      )}
      {...props}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
