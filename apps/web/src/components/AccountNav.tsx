'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFlags } from '../lib/use-flags';
import type { FeatureFlags } from '../lib/flags';

type AccountTab = { href: string; label: string; flag?: keyof FeatureFlags };

const TABS: AccountTab[] = [
  { href: '/account', label: 'Membership' },
  { href: '/account/bid-capacity', label: 'Bid Capacity' },
  { href: '/account/watchlist', label: 'Watchlist' },
  { href: '/account/offers', label: 'Offers' },
  { href: '/account/commercial-offers', label: 'Commercial Offers', flag: 'commercialOffersV2' },
  { href: '/account/activity', label: 'Activity', flag: 'dashboard' },
  { href: '/account/singha-id', label: 'Singha ID', flag: 'singhaId' },
  { href: '/account/eoi', label: 'Interest' },
  { href: '/control-centre', label: 'Control Centre', flag: 'controlCentre' },
  { href: '/account/security', label: 'Security' },
];

/** Horizontal sub-navigation shared across the buyer's account area. Evolution tabs appear only when
 *  their capability flag is enabled (preview with `?evo=on`). */
export function AccountNav() {
  const pathname = usePathname();
  const { flags } = useFlags();
  // Evolution tabs are flag-gated, and under the `?evo=on` preview the flag differs between SSR and
  // the first client render (the override is client-only). Gate on mount so both agree (no hydration
  // mismatch); the flagged tabs then appear once mounted. No-op in production (flag from backend).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tabs = TABS.filter((t) => !t.flag || (mounted && flags[t.flag]));
  return (
    <nav className="mt-6 flex flex-wrap gap-1.5 border-b border-white/[0.07] pb-3">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/[0.08] text-bone'
                : 'text-bone-400 hover:bg-white/[0.04] hover:text-bone'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
