'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { AccountNav } from '../../../components/AccountNav';
import { SignInPrompt } from '../../../components/SignInPrompt';
import { StatusChip } from '../../../components/StatusChip';
import { fetchMyOffers, withdrawOffer, type MyOffer } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatMoney } from '../../../lib/format';

const TERMINAL = ['accepted', 'rejected', 'declined', 'withdrawn', 'expired', 'cancelled'];

export default function OffersPage() {
  const { token, loading } = useAuth();
  const [rows, setRows] = useState<MyOffer[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (token)
      fetchMyOffers(token)
        .then(setRows)
        .catch(() => setRows([]));
  }, [token]);

  async function withdraw(id: string) {
    if (!token) return;
    setBusy(id);
    try {
      const updated = await withdrawOffer(id, token);
      setRows((r) => (r ? r.map((o) => (o.id === id ? updated : o)) : r));
    } finally {
      setBusy(null);
    }
  }

  if (!loading && !token)
    return (
      <SignInPrompt
        title="Your offers"
        description="Sign in to track the private offers you've made."
        next="/account/offers"
      />
    );

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">My offers</h1>
      <p className="mt-2 text-bone-400">Private offers you've placed on exchange lots.</p>
      <AccountNav />

      {rows == null ? (
        <p className="mt-10 text-bone-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="text-bone-300">You haven't made any offers yet.</p>
          <Link
            href="/catalogue?method=MAKE_OFFER"
            className="mt-3 inline-block text-sm text-gold-400"
          >
            Find lots open to offers →
          </Link>
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((o) => (
            <li key={o.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <StatusChip status={o.status} />
                  <p className="mt-1.5 tabular font-display text-2xl font-bold text-gold-400">
                    {formatMoney(o.amountMinor, o.currency)}
                  </p>
                  <Link
                    href={`/lot/${o.listingId}`}
                    className="text-sm text-bone-400 hover:text-bone"
                  >
                    View lot →
                  </Link>
                </div>
                {!TERMINAL.includes(o.status.toLowerCase()) && (
                  <Button variant="outline" disabled={busy === o.id} onClick={() => withdraw(o.id)}>
                    Withdraw
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
