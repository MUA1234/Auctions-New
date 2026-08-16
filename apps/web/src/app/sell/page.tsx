'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiGetAuthed, type SellerListing } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useFlags } from '../../lib/use-flags';
import { humanize } from '../../lib/format';
import { categoryMeta } from '../../lib/categories';
import { SignInPrompt } from '../../components/SignInPrompt';
import { friendlyMessage } from '../../components/evolution/evo-api-error';

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
      setError(friendlyMessage(err, 'Could not load your listings.'));
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
          {listings.map((l, i) => {
            // Real cover photos aren't in this read-model (`SellerListing` has no media
            // field) — a category-tinted glyph gives each row a real visual anchor without
            // faking a photo, so a seller with several similar listings can tell rows apart
            // at a glance (CX10, audit §3.9 "plain text rows with no thumbnail").
            const cat = categoryMeta(l.category);
            return (
              <div
                key={l.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? 'border-t border-white/8' : ''
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `rgba(${cat.rgb},0.14)`, color: `rgb(${cat.rgb})` }}
                >
                  <cat.Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-bone">
                    {l.title ?? l.publicRef}
                  </p>
                  <p className="truncate text-xs capitalize text-bone-500">
                    {l.category} · {humanize(l.saleMethod)} · {l.publicRef}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {mounted && flags.commercialOffersV2 ? (
                    <Link
                      href={`/sell/offers/${l.id}`}
                      className="text-xs font-semibold text-gold-300 transition-colors hover:text-gold-200"
                    >
                      Offers →
                    </Link>
                  ) : null}
                  <Chip tone={l.status === 'scheduled' || l.status === 'live' ? 'gold' : undefined}>
                    {humanize(l.status)}
                  </Chip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
