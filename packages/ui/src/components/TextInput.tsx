import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Text/number input on the canonical `.field` surface (angular, focus-green ring). */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('field w-full', invalid && 'border-outbid/60', className)}
      {...props}
    />
  );
});
