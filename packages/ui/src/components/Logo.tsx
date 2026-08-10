import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Singha wordmark — serif display with a red mark and gold accent dot. */
export function Logo({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('font-serif text-xl font-extrabold tracking-tight text-bone', className)}
      {...props}
    >
      <span className="text-red-500">Singha</span>
      <span className="text-gold-500">.</span>
      <span className="text-bone-300"> Auctions</span>
    </span>
  );
}
