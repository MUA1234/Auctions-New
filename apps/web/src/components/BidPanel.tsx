'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { apiBase, apiGet, placeBid, type AuctionState, type PlaceBidResult } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFlags } from '../lib/use-flags';
import { newIntentId } from '../lib/gesture';
import { formatMoney, humanize, timeLeft } from '../lib/format';
import { GestureBidControl } from './GestureBidControl';
import { Price } from './evolution/Price';
import { friendlyMessage } from './evolution/evo-api-error';

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
  const { flags } = useFlags();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [lead, setLead] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  // Realtime auction state over SSE (pack doc 17): one push connection instead
  // of client polling. Falls back to a 3s poll if the stream can't be opened.
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const startPoll = () => {
      if (poll) return;
      poll = setInterval(async () => {
        try {
          setState(await apiGet<AuctionState>(`/auctions/${auctionId}/state`));
        } catch {
          /* transient */
        }
      }, 3000);
    };
    try {
      es = new EventSource(`${apiBase}/auctions/${auctionId}/stream`);
      es.onmessage = (e) => {
        try {
          setState(JSON.parse(e.data) as AuctionState);
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        startPoll();
      };
    } catch {
      startPoll();
    }
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [auctionId]);

  const current = state.currentBidMinor ?? state.openingBidMinor;
  const minNext =
    state.currentBidMinor == null ? state.openingBidMinor : current + state.incrementMinor;

  const errText = (err: unknown) =>
    friendlyMessage(err, 'Your bid was not accepted. Please try again.');

  /** Reflect an accepted bid — called by the proxy form and the Gesture Bid. */
  async function applyResult(r: PlaceBidResult, msg: string) {
    setLead(r.youLead);
    setMessage(msg);
    setState(await apiGet<AuctionState>(`/auctions/${auctionId}/state`));
  }

  async function bid(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      // Idempotency key so a duplicate network retry never records two bids.
      const r = await placeBid(
        auctionId,
        {
          maxAmountMinor: Math.round(Number(amount) * 100),
          idempotencyKey: newIntentId(),
          source: 'online',
        },
        token,
      );
      await applyResult(
        r,
        r.youLead ? 'You are the highest bidder.' : 'Bid placed — a proxy max is still ahead.',
      );
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
        {/* The bid amount + currency is always the binding source of truth; `Price` adds an
            "≈ … · indicative" display-currency line only when the viewer has picked one AND
            the fxDisplay flag is on (CX4) — never a second binding amount. */}
        <div className="mt-1">
          <Price minor={current} currency={state.currency} className="text-3xl" />
        </div>
        <p className="mt-1 text-sm text-bone-400">
          {state.status === 'open'
            ? `Ends in ${timeLeft(state.endsAt)}`
            : `Status: ${humanize(state.status)}`}
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
        <div className="flex flex-col gap-4">
          {/* Optional deliberate Gesture Bid (pack doc 12), behind gestureBidV3. */}
          {flags.gestureBidV3 && (
            <>
              <GestureBidControl
                auctionId={auctionId}
                state={state}
                token={token}
                onPlaced={applyResult}
              />
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-bone-600">
                <span className="h-px flex-1 bg-white/10" />
                or set a maximum
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}
          <form onSubmit={bid} className="flex flex-col gap-3">
            <label htmlFor="bid-amount" className="text-sm text-bone-400">
              Your maximum bid ({state.currency})
            </label>
            <input
              id="bid-amount"
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
        </div>
      )}
    </Card>
  );
}
