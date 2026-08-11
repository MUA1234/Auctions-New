'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuctionFlowViewport, CubeRow } from '@singha/auctionflow';
import { Button, Card, Chip } from '@singha/ui';
import {
  apiGetAuthed,
  fetchDashboard,
  fetchMyWatch,
  type DashboardGroup,
  type DashboardLot,
  type DashboardProjection,
  type DashboardStrip,
  type MyEoi,
  type MyOffer,
  type WatchedLot,
} from '../../lib/api';
import { signOut, useAuth } from '../../lib/auth';
import { formatMoney, timeLeft } from '../../lib/format';

/**
 * Buyer command centre (pack doc 05). Prefers the server projection
 * `GET /api/v2/me/dashboard` — a top action strip of urgent counts plus status
 * groups (Watching / Bidding / Winning / Outbid / Payment Due / Ready for Pickup
 * / EOI / Offers / Tenders) rendered as Rubik status bands with the SAME CubeRow
 * primitive as the catalogue. When the projection isn't available it degrades to
 * a projection derived from the watchlist, EOIs and offers this client can fetch
 * directly, so the dashboard is always useful.
 */
export default function DashboardPage() {
  const { token, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [projection, setProjection] = useState<DashboardProjection | null>(null);

  const load = useCallback(async (t: string) => {
    setError(null);
    try {
      const server = await fetchDashboard(t);
      if (server) {
        setProjection(server);
        return;
      }
      // Fallback: build a projection from the data we can fetch directly.
      const [eois, offers, watch] = await Promise.all([
        apiGetAuthed<MyEoi[]>('/eoi/mine', t).catch(() => []),
        apiGetAuthed<MyOffer[]>('/exchange/offers/mine', t).catch(() => []),
        fetchMyWatch(t).catch(() => []),
      ]);
      setProjection(deriveProjection(watch, eois, offers));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
    else setProjection(null);
  }, [token, load]);

  if (!token) {
    return (
      <div className="container-page py-16">
        <h1 className="font-serif text-4xl font-bold text-bone">Buyer command centre</h1>
        <Card className="mt-8 max-w-md">
          <p className="text-sm text-bone-400">
            {loading ? 'Checking your session…' : 'Sign in to see your watchlist, bids and offers.'}
          </p>
          {!loading && (
            <Link href="/login?next=/dashboard" className="mt-4 inline-block">
              <Button variant="gold">Sign in</Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  const strip = projection?.strip;
  const groups = (projection?.groups ?? []).filter((g) => g.items.length > 0);

  return (
    <div className="container-page py-14">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-bone">Your command centre</h1>
        <button onClick={signOut} className="text-sm text-bone-400 hover:text-bone-200">
          Sign out
        </button>
      </div>

      {/* Top action strip — urgent counts, never behind rotation (doc 05). */}
      {strip && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Active bids" value={String(strip.activeBids)} />
          <Stat label="Winning" value={String(strip.winning)} tone="good" />
          <Stat label="Outbid" value={String(strip.outbid)} tone="bad" />
          <Stat
            label="Payment due"
            value={
              strip.paymentDueMinor > 0 ? formatMoney(strip.paymentDueMinor, strip.currency) : '—'
            }
            tone={strip.paymentDueMinor > 0 ? 'bad' : undefined}
          />
          <Stat label="Ready for pickup" value={String(strip.readyForPickup)} />
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="mt-10">
          <p className="text-sm text-bone-400">
            Nothing here yet. Open a lot and tap “Watch”, place a bid, or submit an EOI — it appears
            here.{' '}
            <Link href="/catalogue" className="text-gold-400">
              Browse the catalogue →
            </Link>
          </p>
        </Card>
      ) : (
        <div className="mt-10">
          <AuctionFlowViewport>
            <div className="text-bone">
              {groups.map((group) => (
                <CubeRow<DashboardLot>
                  key={group.key}
                  rowId={group.key}
                  title={group.label}
                  subtitle={`${group.items.length}`}
                  items={group.items}
                  itemKey={(lot) => lot.listingId}
                  renderItem={(lot) => <StatusCard lot={lot} groupKey={group.key} />}
                />
              ))}
            </div>
          </AuctionFlowViewport>
        </div>
      )}

      {error && <p className="mt-6 text-sm text-outbid">{error}</p>}
    </div>
  );
}

/** Build a dashboard projection from the per-endpoint data (fallback path). */
function deriveProjection(
  watch: WatchedLot[],
  eois: MyEoi[],
  offers: MyOffer[],
): DashboardProjection {
  const strip: DashboardStrip = {
    activeBids: 0,
    winning: 0,
    outbid: 0,
    paymentDueMinor: 0,
    readyForPickup: 0,
    currency: watch[0]?.currency ?? offers[0]?.currency ?? 'LKR',
  };

  const groups: DashboardGroup[] = [
    {
      key: 'WATCHING',
      label: 'Watching',
      items: watch.map((w) => ({
        listingId: w.listingId,
        reference: w.reference,
        title: w.title,
        category: w.category,
        saleMethod: w.saleMethod,
        status: w.status,
        currency: w.currency,
        currentBidMinor: w.currentBidMinor,
        endsAt: w.endsAt,
      })),
    },
    {
      key: 'EOI_SUBMITTED',
      label: 'Expressions of interest',
      items: eois.map((e) => ({
        listingId: e.listingId,
        reference: e.listingId.slice(-6),
        title: `Listing ${e.listingId.slice(-6)}`,
        category: '',
        saleMethod: 'EXPRESSION_OF_INTEREST',
        status: e.status,
        currency: e.currency,
        amountMinor: e.amountMinor,
      })),
    },
    {
      key: 'OFFERS_ACTIVE',
      label: 'Offers',
      items: offers.map((o) => ({
        listingId: o.listingId,
        reference: o.listingId.slice(-6),
        title: `Listing ${o.listingId.slice(-6)}`,
        category: '',
        saleMethod: 'MAKE_OFFER',
        status: o.status,
        currency: o.currency,
        amountMinor: o.amountMinor,
      })),
    },
  ];

  return { strip, groups };
}

function StatusCard({ lot, groupKey }: { lot: DashboardLot; groupKey: string }) {
  const money =
    lot.currentBidMinor != null
      ? formatMoney(lot.currentBidMinor, lot.currency)
      : lot.amountMinor != null
        ? formatMoney(lot.amountMinor, lot.currency)
        : null;
  const deadline = lot.deadlineAt ?? lot.endsAt;

  return (
    <Link href={`/lot/${lot.listingId}`} className="block h-full">
      <Card className="flex h-full flex-col gap-2 transition-colors hover:border-red-500/30">
        <div className="flex items-center justify-between">
          <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
          <StatusPill groupKey={groupKey} status={lot.status} />
        </div>
        <h3 className="font-display text-sm font-semibold text-bone">{lot.title}</h3>
        {lot.category && <p className="text-xs capitalize text-bone-500">{lot.category}</p>}
        <div className="mt-auto flex items-end justify-between">
          <span className="tabular font-display text-base font-bold text-gold-400">
            {money ?? lot.status.replace(/_/g, ' ')}
          </span>
          {deadline && <span className="text-xs text-bone-400">{timeLeft(deadline)}</span>}
        </div>
        {lot.note && <p className="text-[11px] text-bone-500">{lot.note}</p>}
      </Card>
    </Link>
  );
}

const GROUP_TONE: Record<string, string> = {
  WINNING: 'text-[#5fd0a3]',
  WON: 'text-[#5fd0a3]',
  OUTBID: 'text-outbid',
  LOST: 'text-outbid',
  PAYMENT_DUE: 'text-outbid',
};

function StatusPill({ groupKey, status }: { groupKey: string; status: string }) {
  const tone = GROUP_TONE[groupKey] ?? 'text-bone-500';
  return (
    <span className={`text-[11px] capitalize ${tone}`}>
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-[#5fd0a3]' : tone === 'bad' ? 'text-outbid' : 'text-bone';
  return (
    <Card className="flex flex-col gap-1">
      <span className={`tabular font-display text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-bone-500">{label}</span>
    </Card>
  );
}
