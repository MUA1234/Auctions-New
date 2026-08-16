'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { AccountNav } from '../../../components/AccountNav';
import { SignInPrompt } from '../../../components/SignInPrompt';
import { StatusChip } from '../../../components/StatusChip';
import { fetchMyEois, withdrawEoi, type MyEoi } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatMoney } from '../../../lib/format';

const TERMINAL = ['withdrawn', 'declined', 'expired', 'accepted', 'cancelled'];

export default function EoiPage() {
  const { token, loading } = useAuth();
  const [rows, setRows] = useState<MyEoi[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (token)
      fetchMyEois(token)
        .then(setRows)
        .catch(() => setRows([]));
  }, [token]);

  async function withdraw(id: string) {
    if (!token) return;
    setBusy(id);
    try {
      const updated = await withdrawEoi(id, token);
      setRows((r) => (r ? r.map((e) => (e.id === id ? updated : e)) : r));
    } finally {
      setBusy(null);
    }
  }

  if (!loading && !token)
    return (
      <SignInPrompt
        title="Your expressions of interest"
        description="Sign in to track the lots you've registered interest in."
        next="/account/eoi"
      />
    );

  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">My expressions of interest</h1>
      <p className="mt-2 text-bone-400">Lots you've registered private interest in.</p>
      <AccountNav />

      {rows == null ? (
        <p className="mt-10 text-bone-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="text-bone-300">You haven't registered interest in any lots yet.</p>
          <Link
            href="/catalogue?method=EXPRESSION_OF_INTEREST"
            className="mt-3 inline-block text-sm text-gold-400"
          >
            Find lots open to interest →
          </Link>
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <StatusChip status={e.status} />
                  <p className="mt-1.5 tabular font-display text-2xl font-bold text-gold-400">
                    {e.amountMinor != null
                      ? formatMoney(e.amountMinor, e.currency)
                      : 'Interest registered'}
                  </p>
                  <Link
                    href={`/lot/${e.listingId}`}
                    className="text-sm text-bone-400 hover:text-bone"
                  >
                    View lot →
                  </Link>
                </div>
                {!TERMINAL.includes(e.status.toLowerCase()) && (
                  <Button variant="outline" disabled={busy === e.id} onClick={() => withdraw(e.id)}>
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
