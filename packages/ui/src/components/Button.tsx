import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'gold' | 'dark' | 'outline' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base =
  'hud-cut-sm inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-red-500 text-white hover:bg-red-600 shadow-red-glow',
  gold: 'bg-gold-500 text-coal-950 hover:bg-gold-400 shadow-gold-glow',
  dark: 'border border-white/10 bg-coal-750 text-bone hover:bg-coal-700',
  outline: 'border border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/20',
  ghost: 'border border-white/10 bg-coal-800 text-bone-200 hover:bg-coal-750',
};

/** Angular HUD button in the Singha "Auction-House Luxe" system. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(base, variants[variant], className)} {...props} />
  );
});
