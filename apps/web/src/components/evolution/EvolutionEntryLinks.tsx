'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@singha/ui';
import { useFlags } from '../../lib/use-flags';
import type { FeatureFlags } from '../../lib/flags';

type ButtonVariant = 'primary' | 'gold' | 'dark' | 'outline' | 'ghost';

export type EntryLink = {
  href: string;
  label: string;
  flag: keyof FeatureFlags;
  variant?: ButtonVariant;
};

/**
 * Flag-gated call-to-action row for an editorial IA page (Exchange / Sell / Wanted / Services).
 * Each link appears only when its Singha Evolution capability flag is enabled (preview with
 * `?evo=on`); when none of the links' flags are on, the row renders nothing — so production keeps
 * the calm editorial page exactly as-is. This lets the server page keep its SSR/SEO while the live
 * commerce surfaces become reachable the moment their capability lights up, with no redesign.
 */
export function EvolutionEntryLinks({
  eyebrow = 'Open on Singha Exchange',
  intro,
  links,
}: {
  eyebrow?: string;
  intro?: string;
  links: EntryLink[];
}) {
  const { flags } = useFlags();
  // Under the `?evo=on` preview the flags differ between SSR and the first client render (the
  // override is client-only), so gate on mount to keep both renders identical (no hydration
  // mismatch); the links reveal once mounted. No-op in production (flags resolved from the backend).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = mounted ? links.filter((l) => flags[l.flag]) : [];
  if (shown.length === 0) return null;
  return (
    <div className="mt-12 border-t border-white/[0.07] pt-8">
      <p className="eyebrow text-gold-300">{eyebrow}</p>
      {intro ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bone-400">{intro}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {shown.map((l) => (
          <Link key={l.href} href={l.href}>
            <Button variant={l.variant ?? 'outline'}>{l.label}</Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
