'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Chip } from '@singha/ui';
import { fetchAuctionEventFloor, type AuctionEventFloor, type LiveLotState } from '../../lib/api';
import { formatMoney } from '../../lib/format';

const STATE_LABEL: Record<LiveLotState, string> = {
  pending: 'Upcoming',
  on_block: 'On the block',
  going_once: 'Going once',
  going_twice: 'Going twice',
  sold: 'Sold',
  passed: 'Passed',
  withdrawn: 'Withdrawn',
};

function toneFor(state: LiveLotState): 'live' | 'win' | 'gold' | 'neutral' {
  if (state === 'sold') return 'win';
  if (state === 'on_block') return 'live';
  if (state === 'going_once' || state === 'going_twice') return 'gold';
  return 'neutral';
}

/**
 * §21/§22 (RW6) — the customer live-room consumer. Polls the AUTHORITATIVE floor projection and
 * renders the lot currently on the block, the auctioneer's call state, and the engine's current
 * bid (never a number the screen invents — rule 12), plus the ordered lot rail with per-lot state.
 * Renders a calm "not open yet" card when the live phase is off (the floor read 404s).
 */
export function LiveFloorRoom({ eventId }: { eventId: string }) {
  const [floor, setFloor] = useState<AuctionEventFloor | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      fetchAuctionEventFloor(eventId).then((f) => {
        if (!alive) return;
        setFloor(f);
        setLoaded(true);
      });
    void tick();
    const id = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [eventId]);

  if (loaded && !floor) {
    return (
      <Card className="mt-6 py-10 text-center">
        <p className="text-bone-300">The live floor isn’t open yet.</p>
        <p className="mt-1 text-sm text-bone-500">
          The auctioneer’s console opens when this event goes live.
        </p>
      </Card>
    );
  }

  const current = floor?.current ?? null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* On the block — the authoritative current lot + engine bid. */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-bone-500">On the block</span>
          {current && (
            <Chip tone={toneFor(current.liveState)}>{STATE_LABEL[current.liveState]}</Chip>
          )}
        </div>
        {current ? (
          <>
            <Link
              href={`/lot/${current.listingId}`}
              className="font-serif text-2xl font-bold text-bone hover:text-white"
            >
              {current.title}
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-bone-500">Current bid</p>
              <p className="tabular font-display text-4xl font-bold text-gold-400">
                {current.bid
                  ? formatMoney(
                      current.bid.currentBidMinor ?? current.bid.openingBidMinor,
                      current.bid.currency,
                    )
                  : '—'}
              </p>
              {current.bid && (
                <p className="mt-1 text-xs text-bone-500">
                  {current.bid.bidCount} bid{current.bid.bidCount === 1 ? '' : 's'} · updated live
                  from the auction engine
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="py-6 text-bone-400">Waiting for the auctioneer to open the first lot…</p>
        )}
      </Card>

      {/* The running order — every lot with its live state. */}
      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-bone-500">Running order</p>
        <ul className="mt-3 flex flex-col divide-y divide-white/[0.06]">
          {(floor?.lots ?? []).map((lot) => (
            <li key={lot.lotId} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="tabular w-6 shrink-0 text-bone-500">{lot.sequence}</span>
                <Link
                  href={`/lot/${lot.listingId}`}
                  className="truncate text-bone-200 hover:text-white"
                >
                  {lot.title}
                </Link>
              </span>
              <Chip tone={toneFor(lot.liveState)}>{STATE_LABEL[lot.liveState]}</Chip>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
