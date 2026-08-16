'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip, DataTable, EmptyState, Skeleton, type Column } from '@singha/ui';
import { Price } from './Price';
import { SignInPrompt } from '../../components/SignInPrompt';
import { StatusChip } from '../../components/StatusChip';
import { useAuth } from '../../lib/auth';
import {
  fetchMyCommercialOffers,
  withdrawCommercialOffer,
  type OfferView,
} from '../../lib/evolution-api';

/**
 * Commercial Offer V2 (E4) — the buyer's "my offers" console. Lists every commercial offer the
 * signed-in customer has made (across listings), with its binding amount, sealed state and status,
 * and an inline Withdraw for offers that are still open. Read-only for terminal offers.
 */
const WITHDRAWABLE = new Set(['open', 'submitted', 'pending', 'active', 'countered', 'counter']);

export function MyCommercialOffers() {
  const { token, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<OfferView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setRows(null);
    setError(null);
    fetchMyCommercialOffers(token)
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load your offers.');
      });
    return () => {
      alive = false;
    };
  }, [token, reload]);

  async function withdraw(id: string) {
    if (!token) return;
    setBusy(id);
    setError(null);
    try {
      await withdrawCommercialOffer(id, token);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not withdraw the offer.');
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<OfferView>[] = [
    {
      key: 'listing',
      header: 'Listing',
      render: (o) => {
        // CX5 (pack doc 05): show the real title / reference / location — never the raw
        // listing id. Falls back gracefully for older responses without enrichment.
        const place = o.listing?.location
          ? [o.listing.location.city, o.listing.location.region].filter(Boolean).join(', ')
          : '';
        const meta = [o.listing?.publicRef, place].filter(Boolean).join(' · ');
        return (
          <Link href={`/lot/${o.listingId}`} className="group block max-w-[16rem]">
            <span className="block truncate font-medium text-bone-200 group-hover:text-bone">
              {o.listing?.title || o.listing?.publicRef || 'View listing'}
            </span>
            {meta && <span className="mt-0.5 block truncate text-xs text-bone-500">{meta}</span>}
          </Link>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (o) => <Price minor={o.amountMinor} currency={o.currency} />,
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (o) => <span className="text-bone-400">{o.currency}</span>,
    },
    {
      key: 'sealed',
      header: 'Sealed',
      render: (o) =>
        o.sealed ? <Chip tone="gold">Sealed</Chip> : <span className="text-bone-600">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusChip status={o.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (o) =>
        WITHDRAWABLE.has(o.status.toLowerCase()) ? (
          <Button
            variant="outline"
            className="px-3 py-1.5 text-xs"
            disabled={busy === o.id}
            onClick={() => withdraw(o.id)}
          >
            {busy === o.id ? 'Withdrawing…' : 'Withdraw'}
          </Button>
        ) : (
          <span className="text-bone-600">—</span>
        ),
    },
  ];

  const header = (
    <header>
      <p className="eyebrow text-gold-300">Singha Exchange</p>
      <h1 className="mt-1 font-serif text-3xl sm:text-4xl">My commercial offers</h1>
      <p className="mt-2 text-bone-400">
        Every full-terms offer you&apos;ve placed, with its status and outcome.
      </p>
    </header>
  );

  if (authLoading) {
    return (
      <div className="container-page py-10 sm:py-14">
        {header}
        <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <SignInPrompt
        title="Your commercial offers"
        description="Sign in to track the commercial offers you've made."
        next="/account/commercial-offers"
      />
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      {header}

      <div className="mt-8">
        {error ? (
          <Card className="text-center">
            <p className="text-sm text-outbid">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setReload((n) => n + 1)}>
              Retry
            </Button>
          </Card>
        ) : rows == null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No offers yet"
            description="When you submit a commercial offer on a listing it will appear here."
            action={
              <Link href="/catalogue">
                <Button variant="gold">Browse listings</Button>
              </Link>
            }
          />
        ) : (
          <Card className="p-0">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(o) => o.id}
              minWidth={640}
              empty="No offers yet."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
