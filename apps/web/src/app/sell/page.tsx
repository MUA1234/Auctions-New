'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiGetAuthed, type SellerListing } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SignInPrompt } from '../../components/SignInPrompt';

/** Seller dashboard (docs/05, Phase 5): the seller's own listings + wizard CTA. */
export default function SellerDashboard() {
  const { token } = useAuth();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        <Link href="/sell/new">
          <Button variant="gold">List an asset</Button>
        </Link>
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
              <Chip tone={l.status === 'scheduled' || l.status === 'live' ? 'gold' : undefined}>
                {l.status.replace(/_/g, ' ')}
              </Chip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
