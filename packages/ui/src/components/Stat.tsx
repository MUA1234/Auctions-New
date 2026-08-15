import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type StatTone = 'default' | 'gold' | 'green' | 'amber';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  className?: string;
}

const valueTones: Record<StatTone, string> = {
  default: 'text-bone',
  gold: 'text-gold-400',
  green: 'text-red-300',
  amber: 'text-outbid',
};

/** Compact KPI / metric tile (HUD surface). */
export function Stat({ label, value, hint, tone = 'default', className }: StatProps) {
  return (
    <div className={cn('hud-cut-sm border border-white/[0.07] bg-coal-900/50 p-4', className)}>
      <p className="eyebrow text-bone-500">{label}</p>
      <p className={cn('mt-1 font-display text-2xl font-bold tabular', valueTones[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-bone-500">{hint}</p> : null}
    </div>
  );
}
