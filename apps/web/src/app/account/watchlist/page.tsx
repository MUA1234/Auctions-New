'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { AccountNav } from '../../../components/AccountNav';
import { SignInPrompt } from '../../../components/SignInPrompt';
import { StatusChip } from '../../../components/StatusChip';
import { fetchMyWatch, removeWatch, type WatchedLot } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatMoney, humanize, timeLeft } from '../../../lib/format';

export default function WatchlistPage() {
  const { token, loading } = useAuth();
  const [rows, setRows] = useState<WatchedLot[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (token)
      fetchMyWatch(token)
        .then(setRows)
        .catch(() => setRows([]));
  }, [token]);

  async function unwatch(id: string) {
    if (!token) return;
    setBusy(id);
    try {
      await removeWatch(id, token);
      setRows((r) => (r ? r.filter((x) => x.listingId !== id) : r));
    } finally {
      setBusy(null);
    }
  }

  if (!loading && !token)
    return (
      <SignInPrompt
        title="Your watchlist"
        description="Sign in to see the lots you're tracking."
        next="/account/watchlist"
      />
    );

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">My watchlist</h1>
      <p className="mt-2 text-bone-400">Lots you're tracking across every sale method.</p>
      <AccountNav />

      {rows == null ? (
        <p className="mt-10 text-bone-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="text-bone-300">You're not watching any lots yet.</p>
          <Link href="/catalogue" className="mt-3 inline-block text-sm text-gold-400">
            Browse the catalogue →
          </Link>
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((lot) => (
            <li key={lot.listingId}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusChip status={lot.status} />
                    <span className="text-xs text-bone-500">{lot.reference}</span>
                  </div>
                  <Link
                    href={`/lot/${lot.listingId}`}
                    className="mt-1 block truncate font-display text-lg font-semibold text-bone hover:text-white"
                  >
                    {lot.title}
                  </Link>
                  <p className="text-xs capitalize text-bone-500">
                    {lot.category} · {humanize(lot.saleMethod)}
                    {lot.endsAt ? ` · ends in ${timeLeft(lot.endsAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {lot.currentBidMinor != null && (
                    <span className="tabular font-display text-lg font-bold text-gold-400">
                      {formatMoney(lot.currentBidMinor, lot.currency)}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    disabled={busy === lot.listingId}
                    onClick={() => unwatch(lot.listingId)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
