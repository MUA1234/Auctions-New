'use client';

import Link from 'next/link';
import { Button } from '@singha/ui';
import { useFlags } from '../lib/use-flags';
import { DiscoverDeck } from './DiscoverDeck';
import { BuyerTwinPanel } from './BuyerTwinPanel';

/**
 * Singha Discover surface, gated on `discoverV3` (pack doc 04 §B). Presentation-only
 * gating: the backend is the source of truth for the flag, so a direct visit to
 * `/discover` while the flag is OFF renders a safe, honest fallback instead of a
 * half-built V3 surface. The Buyer Twin insight panel is gated independently on
 * `buyerTwinV3` (pack doc 14 rollout groups the two but keeps them separable).
 */
export function DiscoverExperience() {
  const { flags, loading } = useFlags();

  // Don't flash either the fallback or the deck before flags resolve.
  if (loading) {
    return <p className="py-24 text-center text-bone-500">Loading Discover…</p>;
  }

  if (!flags.discoverV3) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="font-serif text-3xl font-bold text-bone">Discover is coming soon</h1>
        <p className="max-w-md text-bone-400">
          A personalised, swipeable way to find lots you&rsquo;ll love is on its way. In the
          meantime, browse the full catalogue.
        </p>
        <Link href="/catalogue" className="mt-2">
          <Button variant="gold">Browse the catalogue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold text-bone sm:text-4xl">Discover</h1>
        <p className="mx-auto mt-2 max-w-md text-bone-400">
          Swipe right for lots you like, left to pass, or tap to view. A swipe is never a bid.
        </p>
      </header>
      <DiscoverDeck />
      {flags.buyerTwinV3 && <BuyerTwinPanel />}
    </div>
  );
}
