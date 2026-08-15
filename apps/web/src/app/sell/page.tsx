'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiGetAuthed, type SellerListing } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useFlags } from '../../lib/use-flags';
import { SignInPrompt } from '../../components/SignInPrompt';

/** Seller dashboard (docs/05, Phase 5): the seller's own listings + wizard CTA. */
export default function SellerDashboard() {
  const { token } = useAuth();
  const { flags } = useFlags();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Evolution links are flag-gated; under the `?evo=on` preview the flag differs between SSR and the
  // first client render (the override is client-only). Gate on mount so both agree (no hydration
  // mismatch); the links reveal once mounted. No-op in production (flags resolved from the backend).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = useCallback(async (t: string) => {
    try {
      setListings(await apiGetAuthed<SellerListing[]>('/listings/mine', t));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  return (
    <div className="container-page py-14">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-bold text-bone">Seller dashboard</h1>
          <p className="mt-2 text-bone-400">Manage your consignments from listing to settlement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {mounted && flags.supplyProgrammes ? (
            <Link href="/sell/supply">
              <Button variant="outline">Supply programmes</Button>
            </Link>
          ) : null}
          <Link href="/sell/new">
            <Button variant="gold">List an asset</Button>
          </Link>
        </div>
      </div>

      {!token ? (
        <SignInPrompt
          title="Sell with Singha"
          description="Sign in with a seller account to manage your consignments from listing to settlement."
          next="/sell"
          cta="Sign in to sell"
        />
      ) : listings.length === 0 ? (
        <Card className="mt-8">
          <p className="text-sm text-bone-400">
            {error ?? 'No listings yet — start with “List an asset”.'}
          </p>
        </Card>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-white/10">
          {listings.map((l, i) => (
            <div
              key={l.id}
              className={`flex items-center justify-between px-4 py-3 ${
                i > 0 ? 'border-t border-white/8' : ''
              }`}
            >
              <div>
                <p className="font-display text-sm font-semibold text-bone">
                  {l.title ?? l.publicRef}
                </p>
                <p className="text-xs capitalize text-bone-500">
                  {l.category} · {l.saleMethod.replace(/_/g, ' ')} · {l.publicRef}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {mounted && flags.commercialOffersV2 ? (
                  <Link
                    href={`/sell/offers/${l.id}`}
                    className="text-xs font-semibold text-gold-300 transition-colors hover:text-gold-200"
                  >
                    Offers →
                  </Link>
                ) : null}
                <Chip tone={l.status === 'scheduled' || l.status === 'live' ? 'gold' : undefined}>
                  {l.status.replace(/_/g, ' ')}
                </Chip>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
