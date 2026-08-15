import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'gold' | 'dark' | 'outline' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Glossy-glass surface shared by every variant. `isolate` + `-z-10` on the reflection sheen
 * keeps the gloss above the colour tint but below the label; `overflow-hidden` + `rounded-xl`
 * clip the sheen to the glass pane; a light blur completes the glass. Each variant keeps its
 * existing colour and adds a bright top rim (inset highlight) plus a soft coloured outer glow.
 */
const base =
  'group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border px-5 py-2.5 text-sm font-semibold uppercase tracking-wide backdrop-blur-sm transition-[background-color,box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-white/[0.2] bg-red-500/[0.9] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_24px_-6px_rgba(31,160,85,0.65)] hover:bg-red-500 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_30px_-6px_rgba(31,160,85,0.85)]',
  gold: 'border-white/[0.25] bg-gold-500/[0.92] text-coal-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_24px_-6px_rgba(201,162,75,0.65)] hover:bg-gold-400 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_30px_-6px_rgba(201,162,75,0.85)]',
  dark: 'border-white/[0.15] bg-coal-750/[0.8] text-bone shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_22px_-8px_rgba(0,0,0,0.7)] hover:bg-coal-700/[0.85]',
  outline:
    'border-white/[0.25] bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-white/[0.16]',
  ghost:
    'border-white/[0.12] bg-coal-800/[0.7] text-bone-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-coal-750/[0.8]',
};

/** Glossy-glass button in the Singha "Auction-House Luxe" system. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, type = 'button', children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(base, variants[variant], className)} {...props}>
      {/* Glass reflection — brighter across the top, fading down; lifts a touch on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.06) 100%)',
        }}
      />
      {children}
    </button>
  );
});
