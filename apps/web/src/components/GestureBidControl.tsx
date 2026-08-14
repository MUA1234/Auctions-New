'use client';

import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { useReducedMotion } from '@singha/auctionflow';
import { placeBid, type AuctionState, type PlaceBidResult } from '../lib/api';
import { formatMoney } from '../lib/format';
import { isRepriced, newIntentId, nextBidMinor, shouldCommitGesture } from '../lib/gesture';

const ACK_KEY = 'singha_gesture_ack';
const HANDLE = 64; // px

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

/**
 * Deliberate Gesture Bid (pack doc 12). A purposeful horizontal swipe places ONE
 * bid at the exact next increment. The amount is shown throughout; a short flick
 * snaps back; a first-time swipe requires an explicit binding-bid acknowledgement;
 * every command carries an idempotency key (a duplicate never double-bids); and if
 * the price moves mid-swipe we reprice and ask again rather than submit a surprise
 * amount. UI only reflects "placed" AFTER the authoritative server response.
 */
export function GestureBidControl({
  auctionId,
  state,
  token,
  onPlaced,
}: {
  auctionId: string;
  state: AuctionState;
  token: string;
  onPlaced: (r: PlaceBidResult, message: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const startX = useRef(0);
  const startAmount = useRef(0);
  const [travel, setTravel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState<{ amount: number } | null>(null);

  const amount = nextBidMinor(state.currentBidMinor, state.openingBidMinor, state.incrementMinor);
  const maxTravel = () => Math.max(1, (trackRef.current?.clientWidth ?? 0) - HANDLE);

  const snapBack = () => setTravel(0);

  async function doBid(bidAmount: number) {
    setBusy(true);
    setError(null);
    const idempotencyKey = newIntentId();
    try {
      const r = await placeBid(
        auctionId,
        { maxAmountMinor: bidAmount, idempotencyKey, source: 'online' },
        token,
      );
      vibrate(30);
      onPlaced(
        r,
        r.youLead ? 'You are the highest bidder.' : 'Bid placed — a proxy max is still ahead.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Bid was not accepted — the price may have moved.',
      );
    } finally {
      setBusy(false);
      snapBack();
    }
  }

  function commit() {
    // Reprice guard: never submit a larger surprise amount if the price moved.
    const current = nextBidMinor(
      state.currentBidMinor,
      state.openingBidMinor,
      state.incrementMinor,
    );
    if (isRepriced(startAmount.current, current)) {
      setError(`Price moved to ${formatMoney(current, state.currency)} — swipe again to bid.`);
      snapBack();
      return;
    }
    // First-use acknowledgement that a completed swipe is a binding bid.
    const acked = typeof window !== 'undefined' && localStorage.getItem(ACK_KEY) === '1';
    if (!acked) {
      setAck({ amount: startAmount.current });
      snapBack();
      return;
    }
    void doBid(startAmount.current);
  }

  const begin = (clientX: number) => {
    if (busy) return;
    startX.current = clientX;
    startAmount.current = amount;
    setError(null);
    setDragging(true);
  };
  const move = (clientX: number) => {
    if (!dragging) return;
    setTravel(Math.min(Math.max(clientX - startX.current, 0), maxTravel()));
  };
  const end = () => {
    if (!dragging) return;
    setDragging(false);
    if (shouldCommitGesture(travel, maxTravel())) commit();
    else snapBack();
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    begin(e.clientX);
  };
  const progress = Math.round((travel / maxTravel()) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-bone-500">Next bid</span>
        <span className="tabular font-display text-lg font-bold text-gold-400">
          {formatMoney(amount, state.currency)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-14 select-none overflow-hidden rounded-full border border-white/10 bg-coal-800"
        onPointerMove={(e) => move(e.clientX)}
        onPointerUp={end}
        onPointerCancel={() => {
          setDragging(false);
          snapBack();
        }}
      >
        {/* Fill showing swipe progress. */}
        <div
          className="absolute inset-y-0 left-0 bg-red-500/25"
          style={{
            width: `${travel + HANDLE}px`,
            transition: dragging || reduced ? 'none' : 'width 200ms ease',
          }}
          aria-hidden
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold uppercase tracking-wide text-bone-300">
          {busy ? 'Placing…' : 'Swipe to bid →'}
        </span>
        {/* Draggable handle — also keyboard-activatable (Enter/Space) as the a11y equivalent. */}
        <button
          type="button"
          disabled={busy}
          aria-label={`Swipe to bid ${formatMoney(amount, state.currency)}`}
          onPointerDown={onPointerDown}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startAmount.current = amount;
              commit();
            }
          }}
          className="absolute left-1 top-1 flex h-12 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-red-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 disabled:opacity-60"
          style={{
            transform: `translateX(${travel}px)`,
            transition:
              dragging || reduced ? 'none' : 'transform 200ms cubic-bezier(0.22,0.61,0.36,1)',
          }}
        >
          <span aria-hidden>{progress >= 82 ? '✓' : '→'}</span>
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-outbid">{error}</p>}

      {ack && (
        <div className="mt-3 rounded-lg border border-gold-500/30 bg-gold-500/[0.07] p-3">
          <p className="text-sm text-bone-200">
            Completing the swipe places a <strong>binding bid</strong> of{' '}
            <span className="font-semibold text-gold-300">
              {formatMoney(ack.amount, state.currency)}
            </span>{' '}
            under the auction terms. This confirmation is shown once.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(ACK_KEY, '1');
                const amt = ack.amount;
                setAck(null);
                void doBid(amt);
              }}
              className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              I understand — place bid
            </button>
            <button
              type="button"
              onClick={() => setAck(null)}
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-bone-300 hover:border-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
