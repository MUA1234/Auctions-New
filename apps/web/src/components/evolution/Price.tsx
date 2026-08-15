'use client';
import { useEffect, useState } from 'react';
import { cn } from '@singha/ui';
import { formatMoney } from '../../lib/format';
import { useDisplayCurrency } from '../../lib/display-currency';
import { useFlags } from '../../lib/use-flags';
import { fxConvert } from '../../lib/evolution-api';

/**
 * A binding price with an OPTIONAL informational display-currency conversion (E5). The native
 * amount is always shown as the source of truth; when the viewer has picked a display currency and
 * `fxDisplay` is on, an "≈ … · indicative" line is appended — explicitly non-binding (D5).
 */
export function Price({
  minor,
  currency = 'LKR',
  className,
  emphasize = true,
}: {
  minor: number | null;
  currency?: string;
  className?: string;
  emphasize?: boolean;
}) {
  const { flags } = useFlags();
  const [display] = useDisplayCurrency();
  const [converted, setConverted] = useState<number | null>(null);
  const want = Boolean(flags.fxDisplay && display && display !== currency && minor != null);

  useEffect(() => {
    let alive = true;
    setConverted(null);
    if (!want || minor == null || !display) return;
    fxConvert(currency, display, minor)
      .then((r) => {
        if (alive) setConverted(r.convertedMinor);
      })
      .catch(() => {
        /* fx off/unavailable — silently show native only */
      });
    return () => {
      alive = false;
    };
  }, [want, currency, display, minor]);

  return (
    <span className={cn('whitespace-nowrap', className)}>
      <span className={cn('tabular', emphasize && 'font-display font-bold text-gold-400')}>
        {formatMoney(minor, currency)}
      </span>
      {converted != null && display ? (
        <span className="ml-2 text-xs font-normal text-bone-500">
          ≈ {formatMoney(converted, display)} · indicative
        </span>
      ) : null}
    </span>
  );
}
