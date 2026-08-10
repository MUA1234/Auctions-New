import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

/** Premium elevated panel with a whisper edge and top catch-light. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'hud-cut-sm border border-white/[0.07] bg-gradient-to-b from-coal-800/50 to-coal-900/75 p-5 backdrop-blur',
        className,
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
      {...props}
    />
  );
});
