'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/account', label: 'Membership' },
  { href: '/account/bid-capacity', label: 'Bid Capacity' },
  { href: '/account/watchlist', label: 'Watchlist' },
  { href: '/account/offers', label: 'Offers' },
  { href: '/account/eoi', label: 'Interest' },
  { href: '/account/security', label: 'Security' },
];

/** Horizontal sub-navigation shared across the buyer's account area. */
export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 flex flex-wrap gap-1.5 border-b border-white/[0.07] pb-3">
      {TABS.map((t) => {
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
