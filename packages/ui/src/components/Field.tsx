import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** Canonical labelled form field: label (+ required marker), the control, and a hint/error line. */
export function Field({ label, hint, error, required, htmlFor, className, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className={cn('block', className)}>
      <span className="mb-1 flex items-center gap-1 text-sm text-bone-400">
        {label}
        {required ? (
          <span className="text-red-300" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-bone-500">{hint}</span> : null}
      {error ? (
        <span className="mt-1 block text-xs text-outbid" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
