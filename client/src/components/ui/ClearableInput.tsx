import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CommitInput, type CommitInputProps } from './CommitInput';

export interface ClearableInputProps extends CommitInputProps {
  /** Shows a small × that calls this (e.g. to drop a manual override). */
  onClear?: () => void;
  clearLabel?: string;
}

/** A CommitInput with an optional × button inside it. */
export function ClearableInput({
  onClear,
  clearLabel = 'Clear',
  className,
  ...props
}: ClearableInputProps) {
  return (
    <div className="relative">
      <CommitInput className={cn('no-spin', onClear && 'pr-7', className)} {...props} />
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          title={clearLabel}
          aria-label={clearLabel}
          className="focus-ring absolute inset-y-0 right-1 my-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
