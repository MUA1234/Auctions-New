import { cn } from '../lib/cn';

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  tabs: readonly TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Underline tab bar (gold active underline). Controlled — the parent owns `active`. */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex flex-wrap gap-1 border-b border-white/10', className)}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              on
                ? 'border-gold-400 text-bone'
                : 'border-transparent text-bone-400 hover:text-bone-200',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
