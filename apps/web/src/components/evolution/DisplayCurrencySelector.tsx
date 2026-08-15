'use client';
import { useEffect, useState } from 'react';
import { CURRENCIES } from '../../lib/format';
import { useDisplayCurrency } from '../../lib/display-currency';
import { useFlags } from '../../lib/use-flags';

/**
 * Display-currency picker (E5). Presentation only — switching it never alters any binding
 * transaction currency; it just toggles the informational conversion shown next to prices. Hidden
 * unless `multiCurrency` is enabled.
 */
export function DisplayCurrencySelector({ className }: { className?: string }) {
  const { flags } = useFlags();
  const [display, setDisplay] = useDisplayCurrency();
  // `multiCurrency` can differ between SSR and the first client render under the `?evo=on` preview
  // (the preview override is only visible client-side), and the selected currency is read from
  // localStorage — both client-only. Gate on mount so server and first client render agree (no
  // hydration mismatch); the selector then appears once mounted. Mirrors the Header nav-swap guard.
  // In production (flag resolved from the backend) this is a no-op.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !flags.multiCurrency) return null;
  return (
    <label className={className}>
      <span className="sr-only">Display currency</span>
      <select
        aria-label="Display currency"
        className="field h-9 py-1 text-xs"
        value={display ?? ''}
        onChange={(e) => setDisplay(e.target.value || null)}
      >
        <option value="">Native currency</option>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </label>
  );
}
