'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { apiGet, apiPost, type AuctionState } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatMoney, timeLeft } from '../lib/format';

export function BidPanel({
  auctionId,
  initial,
  lotId,
}: {
  auctionId: string;
  initial: AuctionState;
  lotId?: string;
}) {
  const [state, setState] = useState<AuctionState>(initial);
  const { token } = useAuth();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [lead, setLead] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        setState(await apiGet<AuctionState>(`/auctions/${auctionId}/state`));
      } catch {
        /* transient */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [auctionId]);

  const current = state.currentBidMinor ?? state.openingBidMinor;
  const minNext =
    state.currentBidMinor == null ? state.openingBidMinor : current + state.incrementMinor;

  const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

  async function bid(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const r = await apiPost<{ youLead: boolean }>(
        `/auctions/${auctionId}/bids`,
        { maxAmountMinor: Math.round(Number(amount) * 100) },
        token ?? undefined,
      );
      setLead(r.youLead);
      setMessage(
        r.youLead ? 'You are the highest bidder.' : 'Bid placed — a proxy max is still ahead.',
      );
      setState(await apiGet<AuctionState>(`/auctions/${auctionId}/state`));
      setAmount('');
    } catch (err) {
      setLead(null);
      setMessage(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="sticky top-20 flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-bone-500">Current bid</p>
        <p className="tabular font-display text-3xl font-bold text-gold-400">
          {formatMoney(current, state.currency)}
        </p>
        <p className="mt-1 text-sm text-bone-400">
          {state.status === 'open'
            ? `Ends in ${timeLeft(state.endsAt)}`
            : `Status: ${state.status}`}
        </p>
      </div>

      {message && <p className={`text-sm ${lead ? 'text-[#5fd0a3]' : 'text-outbid'}`}>{message}</p>}

      {state.status !== 'open' ? (
        <p className="text-sm text-bone-400">Bidding is closed for this lot.</p>
      ) : !token ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-bone-400">Sign in to place a proxy bid on this lot.</p>
          <Link href={`/login?next=${encodeURIComponent(lotId ? `/lot/${lotId}` : '/dashboard')}`}>
            <Button variant="gold" className="w-full">
              Sign in to bid
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={bid} className="flex flex-col gap-3">
          <label className="text-sm text-bone-400">Your maximum bid ({state.currency})</label>
          <input
            className="field tabular"
            type="number"
            required
            min={minNext / 100}
            step={state.incrementMinor / 100}
            placeholder={String(minNext / 100)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-bone-500">
            Minimum {formatMoney(minNext, state.currency)}. We bid up to your max automatically
            (proxy).
          </p>
          <Button type="submit" variant="primary" disabled={busy}>
            Place bid
          </Button>
        </form>
      )}
    </Card>
  );
}
