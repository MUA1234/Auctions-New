'use client';

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Chip } from '@singha/ui';
import { resolveAxis, useReducedMotion } from '@singha/auctionflow';
import {
  addWatch,
  fetchDiscoverFeed,
  recordDiscoveryEvent,
  type DiscoverFeedItem,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { mediaUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

const THRESHOLD = 90; // px of horizontal travel to decide

function anonSession(): string {
  try {
    const k = 'singha_anon_session';
    let v = localStorage.getItem(k);
    if (!v) {
      v = `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

/**
 * Singha Discover swipe deck (pack doc 11). Right = Interested (watch), left = Not
 * interested, tap/View = open the lot. A swipe is NEVER a bid or purchase — it only
 * records a preference signal (best-effort; a failed signal never breaks the UX).
 * Explicit buttons mirror the gestures for accessibility; reduced-motion still works.
 */
export function DiscoverDeck() {
  const { token } = useAuth();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [items, setItems] = useState<DiscoverFeedItem[] | null>(null);
  const [i, setI] = useState(0);
  const [drag, setDrag] = useState(0);
  const [flA, setFly] = useState<0 | 1 | -1>(0);
  const start = useRef<{ x: number; y: number; axis: 'horizontal' | 'vertical' | null } | null>(
    null,
  );

  useEffect(() => {
    fetchDiscoverFeed(30)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  const current = items?.[i];

  function signal(listingId: string, eventType: string) {
    const anon = token ? undefined : anonSession();
    void recordDiscoveryEvent(
      { listingId, eventType, sourceSurface: 'DISCOVER', anonymousSessionId: anon },
      token ?? undefined,
    );
  }

  function decide(dir: 1 | -1) {
    if (!current) return;
    if (dir === 1) {
      signal(current.listingId, token ? 'WATCH' : 'LIKE');
      if (token) void addWatch(current.listingId, token).catch(() => undefined);
    } else {
      signal(current.listingId, 'DISLIKE');
    }
    setFly(dir);
    const advance = () => {
      setFly(0);
      setDrag(0);
      setI((n) => n + 1);
    };
    if (reduced) advance();
    else setTimeout(advance, 260);
  }

  function open() {
    if (!current) return;
    signal(current.listingId, 'OPEN');
    router.push(`/lot/${current.listingId}`);
  }

  const onDown = (e: ReactPointerEvent) => {
    if (flA) return;
    start.current = { x: e.clientX, y: e.clientY, axis: null };
  };
  const onMove = (e: ReactPointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.axis) s.axis = resolveAxis(e.clientX - s.x, e.clientY - s.y);
    if (s.axis === 'horizontal') setDrag(e.clientX - s.x);
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (drag > THRESHOLD) decide(1);
    else if (drag < -THRESHOLD) decide(-1);
    else setDrag(0);
  };

  if (items == null) return <p className="py-16 text-center text-bone-500">Loading Discover…</p>;
  if (!current) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-serif text-2xl font-bold text-bone">You&rsquo;re all caught up</p>
        <p className="max-w-sm text-bone-400">
          You&rsquo;ve seen the freshest matches. New lots are added continuously.
        </p>
        <Link href="/catalogue">
          <Button variant="gold">Browse the catalogue</Button>
        </Link>
      </div>
    );
  }

  const offX = flA ? flA * 600 : drag;
  const rot = offX / 20;
  const decision = drag > 40 ? 'interested' : drag < -40 ? 'pass' : null;

  return (
    <div className="mx-auto max-w-sm">
      <div className="relative h-[460px] select-none">
        {/* Next card peeking behind for depth. */}
        {items[i + 1] && (
          <div className="absolute inset-x-3 top-3 h-full scale-95 rounded-3xl bg-coal-800 ring-1 ring-white/[0.06]" />
        )}
        <div
          className="absolute inset-0 touch-pan-y overflow-hidden rounded-3xl bg-coal-800 ring-1 ring-white/10"
          style={{
            transform: `translateX(${offX}px) rotate(${rot}deg)`,
            transition: start.current ? 'none' : 'transform 260ms cubic-bezier(0.22,0.61,0.36,1)',
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            start.current = null;
            setDrag(0);
          }}
        >
          <button type="button" onClick={open} className="block h-full w-full text-left">
            <div className="relative h-full">
              <LotImage src={mediaUrl(current.coverStorageKey)} alt={current.title} aspect="h-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coal-950/95 via-coal-950/40 to-transparent" />
              {/* Swipe intent badges. */}
              {decision === 'interested' && (
                <span className="absolute left-4 top-4 rounded-lg border-2 border-win px-3 py-1 text-lg font-black uppercase text-win">
                  Interested
                </span>
              )}
              {decision === 'pass' && (
                <span className="absolute right-4 top-4 rounded-lg border-2 border-outbid px-3 py-1 text-lg font-black uppercase text-outbid">
                  Pass
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <Chip>{current.saleMethod.replace(/_/g, ' ')}</Chip>
                <h3 className="mt-2 line-clamp-2 font-serif text-2xl font-bold text-bone">
                  {current.title}
                </h3>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="tabular font-display text-xl font-bold text-gold-400">
                    {current.currentBidMinor != null
                      ? formatMoney(current.currentBidMinor, current.currency)
                      : 'View lot'}
                  </span>
                  {current.endsAt && (
                    <span className="text-xs text-bone-300">Ends in {timeLeft(current.endsAt)}</span>
                  )}
                </div>
                {current.reason && (
                  <p className="mt-2 text-xs text-emerald-300/90">✦ {current.reason}</p>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Explicit controls mirror the gestures (accessibility). */}
      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => decide(-1)}
          aria-label="Not interested"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-outbid/40 bg-outbid/10 text-2xl text-outbid transition hover:bg-outbid/20"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={open}
          aria-label="View lot"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-bone-200 transition hover:text-bone"
        >
          ↗
        </button>
        <button
          type="button"
          onClick={() => decide(1)}
          aria-label="Interested"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-win/40 bg-win/10 text-2xl text-win transition hover:bg-win/20"
        >
          ♥
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-bone-600">
        Swipe right for interested, left to pass, or tap to view. A swipe is not a bid.
      </p>
    </div>
  );
}
