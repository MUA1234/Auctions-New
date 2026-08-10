import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type ChipTone = 'neutral' | 'live' | 'gold' | 'win' | 'outbid';

const tones: Record<ChipTone, string> = {
  neutral: 'bg-coal-750 text-bone-200 border border-white/10',
  live: 'bg-red-500/15 text-red-300 border border-red-500/30',
  gold: 'bg-gold-500/15 text-gold-200 border border-gold-500/30',
  win: 'bg-[#2fae7a]/15 text-[#5fd0a3] border border-[#2fae7a]/30',
  outbid: 'bg-[#e8933c]/15 text-[#f0b271] border border-[#e8933c]/30',
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

/** Small status pill — sale-method badges, live/reserve states, etc. */
export function Chip({ tone = 'neutral', className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'hud-cut-xs inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
