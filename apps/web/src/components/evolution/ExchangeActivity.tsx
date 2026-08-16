'use client';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip, EmptyState, Skeleton, Stat, cn } from '@singha/ui';
import { SignInPrompt } from '../../components/SignInPrompt';
import { StatusChip } from '../../components/StatusChip';
import { useAuth } from '../../lib/auth';
import { formatDate, formatMoney } from '../../lib/format';
import { fetchDashboard, type DashboardGroup, type DashboardProjection } from '../../lib/api';
import {
  type CapabilityGrant,
  type DashboardSection,
  type EvoDashboard,
  type StatusCount,
  fetchCapabilities,
  fetchEvoDashboard,
} from '../../lib/evolution-api';
import { friendlyMessage } from './evo-api-error';
import {
  capabilityLabel,
  isExpiringSoon,
  passportState,
  PassportStateChip,
} from './capability-state';

/**
 * Cross-domain customer Command Centre (CX7, pack doc 05). A single read-only view of everything
 * the customer is buying, selling and verifying across Singha, LED by a "Needs your attention"
 * triage of the actionable items the read-model can actually express, then organised into lanes —
 * Buying · Selling · Wanted · Logistics · Documents — each rendered only when its data source is
 * available, each with a friendly empty state instead of a raw error. Assembled from two
 * authoritative, already-shipped read models: the aggregate `/dashboard` projection
 * (`fetchEvoDashboard`, E11) and, where available, the richer per-lot buyer command-centre
 * projection (`fetchDashboard`, pack doc 05 — the same data source the `/dashboard` Rubik view
 * uses) for auction stage/deadline detail the aggregate can't express. Every metric links back to
 * the surface that owns it — this page never mutates state, it only reflects and routes.
 */

interface AttentionItem {
  key: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
}

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

/** Sum StatusCount entries whose (lower-cased) status is one of `statuses`. */
function sumStatuses(items: StatusCount[], statuses: string[]): number {
  const set = new Set(statuses);
  return items
    .filter((s) => set.has(s.status.toLowerCase()))
    .reduce((total, s) => total + s.count, 0);
}

/** Count buyer command-centre lots whose `endsAt` falls within the next `hours` (default 48h —
 *  the same "ending soon" window already used by the catalogue's `endingSoon` filter). */
function countClosingSoon(groups: DashboardGroup[], hours = 48): number {
  const now = Date.now();
  const cutoff = now + hours * 60 * 60 * 1000;
  let count = 0;
  for (const group of groups) {
    for (const item of group.items) {
      if (!item.endsAt) continue;
      const t = new Date(item.endsAt).getTime();
      if (Number.isFinite(t) && t > now && t <= cutoff) count += 1;
    }
  }
  return count;
}

/**
 * Derive the "Needs your attention" list from fields the dashboard/activity read-models already
 * return — never invented. Each item is grounded in a typed, existing field: the buyer
 * command-centre `strip` (outbid / payment due / ready for pickup), lot `endsAt` (closing soon),
 * commercial-offer status counts (countered), and capability grants (action needed / expiring).
 */
function buildAttentionItems(
  evo: EvoDashboard,
  buyer: DashboardProjection | null,
  caps: CapabilityGrant[],
): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (buyer) {
    const { strip, groups } = buyer;
    if (strip.outbid > 0) {
      items.push({
        key: 'outbid',
        title: `You're outbid on ${strip.outbid} ${pluralize(strip.outbid, 'lot')}`,
        detail: 'Raise your bid before time runs out, or let it go.',
        href: '/dashboard',
        cta: 'Review bids',
      });
    }
    if (strip.paymentDueMinor > 0) {
      items.push({
        key: 'payment-due',
        title: `Payment due: ${formatMoney(strip.paymentDueMinor, strip.currency)}`,
        detail: 'Complete payment to secure your winning lot(s).',
        href: '/dashboard',
        cta: 'Pay now',
      });
    }
    if (strip.readyForPickup > 0) {
      items.push({
        key: 'ready-for-pickup',
        title: `${strip.readyForPickup} ${pluralize(strip.readyForPickup, 'lot')} ready for collection`,
        detail: 'Arrange pickup or delivery for your won lot(s).',
        href: '/dashboard',
        cta: 'Arrange collection',
      });
    }
    const closingSoon = countClosingSoon(groups);
    if (closingSoon > 0) {
      items.push({
        key: 'closing-soon',
        title: `${closingSoon} ${pluralize(closingSoon, 'lot')} closing within 48 hours`,
        detail: 'Review before time runs out.',
        href: '/dashboard',
        cta: 'View lots',
      });
    }
  }

  const countered = sumStatuses(evo.buying.offers.byStatus, ['countered', 'counter']);
  if (countered > 0) {
    items.push({
      key: 'countered-offers',
      title: `${countered} counter-offer${countered === 1 ? '' : 's'} to respond to`,
      detail: 'The seller proposed new terms — accept, decline or counter again.',
      href: '/account/commercial-offers',
      cta: 'Respond',
    });
  }

  const actionCaps = caps.filter((c) => passportState(c.status, c.expiresAt) === 'action');
  if (actionCaps.length > 0) {
    items.push({
      key: 'verification-action',
      title: `${actionCaps.length} verification ${pluralize(actionCaps.length, 'item')} need${
        actionCaps.length === 1 ? 's' : ''
      } action`,
      detail: actionCaps.map((c) => capabilityLabel(c.capability)).join(', '),
      href: '/account/singha-id',
      cta: 'Review Singha ID',
    });
  }

  const expiringCaps = caps.filter(
    (c) => passportState(c.status, c.expiresAt) === 'verified' && isExpiringSoon(c.expiresAt),
  );
  if (expiringCaps.length > 0) {
    items.push({
      key: 'verification-expiring',
      title: `${expiringCaps.length} ${pluralize(expiringCaps.length, 'verification')} expiring soon`,
      detail: expiringCaps.map((c) => capabilityLabel(c.capability)).join(', '),
      href: '/account/singha-id',
      cta: 'Renew',
    });
  }

  return items;
}

function AttentionSection({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="attention-heading">
      <h2 id="attention-heading" className="font-serif text-xl text-bone">
        Needs your attention
      </h2>
      {items.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-bone-300">
            You&rsquo;re all caught up — nothing needs action right now.
          </p>
        </Card>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="group block h-full hud-cut-sm border border-outbid/25 bg-[#e8933c]/[0.06] p-4 transition-colors hover:border-outbid/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
              >
                <p className="font-display text-sm font-semibold text-bone">{item.title}</p>
                <p className="mt-1 text-xs text-bone-400">{item.detail}</p>
                <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-wide text-outbid group-hover:text-[#f0b271]">
                  {item.cta} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ranks a status token into a rough progression order (in-flight → settled → stopped) so a
 *  breakdown reads left-to-right as a journey, without claiming any stage the data can't back. */
const STEP_IN_FLIGHT = new Set([
  'pending',
  'submitted',
  'review',
  'countered',
  'counter',
  'negotiate',
  'shortlist',
  'open',
]);
const STEP_STOPPED = new Set([
  'outbid',
  'declined',
  'rejected',
  'withdrawn',
  'expired',
  'lapsed',
  'cancelled',
]);
function stepRank(status: string): number {
  const s = status.toLowerCase();
  if (STEP_IN_FLIGHT.has(s)) return 0;
  if (STEP_STOPPED.has(s)) return 2;
  return 1; // settled/won/verified/etc. — sits between in-flight and stopped
}

/** A readable, ordered "steps so far" breakdown — the real statuses the API returned, connected
 *  as a light progression instead of an unordered bag of chips. */
function StatusSteps({
  items,
  href,
  linkLabel,
}: {
  items: StatusCount[];
  href?: string;
  linkLabel?: string;
}) {
  if (!items || items.length === 0)
    return <p className="mt-2 text-xs text-bone-600">Nothing here yet.</p>;
  const ordered = [...items].sort((a, b) => stepRank(a.status) - stepRank(b.status));
  return (
    <div className="mt-2">
      <ol className="flex flex-wrap items-center gap-1.5">
        {ordered.map((s, i) => (
          <li key={s.status} className="flex items-center gap-1.5">
            <StatusChip status={s.status} />
            <span className="tabular text-xs text-bone-500">×{s.count}</span>
            {i < ordered.length - 1 ? <span aria-hidden className="h-px w-3 bg-white/10" /> : null}
          </li>
        ))}
      </ol>
      {href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-xs font-medium text-gold-400 hover:text-gold-300"
        >
          {linkLabel ?? 'View'} →
        </Link>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  flow,
  href,
  linkLabel,
}: {
  label: string;
  value: number;
  flow?: StatusCount[];
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="min-w-0">
      <Stat label={label} value={value} />
      {flow ? (
        <StatusSteps items={flow} href={href} linkLabel={linkLabel} />
      ) : href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-xs font-medium text-gold-400 hover:text-gold-300"
        >
          {linkLabel ?? 'View'} →
        </Link>
      ) : null}
    </div>
  );
}

function Lane({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="font-serif text-xl text-bone">
        {title}
      </h2>
      <p className="mt-1 text-sm text-bone-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type AuctionStageKey = 'bidding' | 'won' | 'payment' | 'collection' | 'complete';

const AUCTION_STAGES: ReadonlyArray<{ key: AuctionStageKey; label: string }> = [
  { key: 'bidding', label: 'Bidding' },
  { key: 'won', label: 'Won' },
  { key: 'payment', label: 'Payment' },
  { key: 'collection', label: 'Collection' },
  { key: 'complete', label: 'Complete' },
];

/**
 * Classify a buyer command-centre group (`GET /api/v2/me/dashboard`) into a stage of the
 * canonical auction journey (Bidding → Won → Payment → Collection → Complete — pack doc 05's
 * stepper example). Grounded in the group keys the existing `/dashboard` page already treats as
 * real (`GROUP_TONE` / `deriveProjection` in `app/dashboard/page.tsx`: WATCHING, WINNING, OUTBID,
 * WON, PAYMENT_DUE). An unrecognised key returns null and is shown as a plain chip instead — we
 * never invent a stage a key doesn't support.
 */
function auctionStage(groupKey: string): AuctionStageKey | null {
  const k = groupKey.toUpperCase();
  if (k.includes('PAYMENT')) return 'payment';
  if (k.includes('PICKUP') || k.includes('COLLECT') || k.includes('READY')) return 'collection';
  if (k.includes('COMPLETE') || k.includes('DELIVERED') || k.includes('SETTLED')) return 'complete';
  if (k.includes('WON')) return 'won';
  if (k.includes('WATCH') || k.includes('BID') || k.includes('WINNING') || k.includes('OUTBID'))
    return 'bidding';
  return null;
}

/** A readable auction-journey stepper built from the buyer command-centre's real group counts. */
function AuctionStepper({ groups }: { groups: DashboardGroup[] }) {
  const counts = new Map<AuctionStageKey, number>();
  const other: DashboardGroup[] = [];
  for (const group of groups) {
    const stage = auctionStage(group.key);
    if (!stage) {
      if (group.items.length > 0) other.push(group);
      continue;
    }
    counts.set(stage, (counts.get(stage) ?? 0) + group.items.length);
  }
  const hasStageActivity = AUCTION_STAGES.some((s) => (counts.get(s.key) ?? 0) > 0);
  if (!hasStageActivity && other.length === 0) return null;

  return (
    <div>
      <ol aria-label="Your auction progress" className="flex flex-wrap items-center">
        {AUCTION_STAGES.map((stage, i) => {
          const count = counts.get(stage.key) ?? 0;
          const active = count > 0;
          return (
            <li key={stage.key} className="flex items-center">
              <span
                className={cn(
                  'hud-cut-xs inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                  active
                    ? 'border-gold-500/30 bg-gold-500/[0.08] text-gold-200'
                    : 'border-white/[0.06] text-bone-600',
                )}
              >
                {stage.label}
                {active ? <span className="tabular">· {count}</span> : null}
              </span>
              {i < AUCTION_STAGES.length - 1 ? (
                <span aria-hidden className="mx-1.5 h-px w-3 bg-white/10 sm:w-5" />
              ) : null}
            </li>
          );
        })}
      </ol>
      {other.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {other.map((group) => (
            <li key={group.key}>
              <Chip tone={group.key.toUpperCase().includes('OUTBID') ? 'outbid' : 'neutral'}>
                {group.label} · {group.items.length}
              </Chip>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href="/dashboard"
        className="mt-3 inline-block text-xs font-medium text-gold-400 hover:text-gold-300"
      >
        Open full command centre →
      </Link>
    </div>
  );
}

/** Documents lane content: per-capability passport rows when we have them, else the aggregate. */
function DocumentsPanel({
  caps,
  verification,
}: {
  caps: CapabilityGrant[];
  verification: DashboardSection;
}) {
  if (caps.length === 0 && verification.total === 0) {
    return (
      <EmptyState
        title="No verification requested yet"
        description="Request a capability from your Singha ID to unlock bidding, selling or trade."
        action={
          <Link href="/account/singha-id">
            <Button variant="outline">Open Singha ID</Button>
          </Link>
        }
      />
    );
  }
  if (caps.length > 0) {
    return (
      <div>
        <ul className="divide-y divide-white/[0.06]">
          {caps.map((c) => {
            const state = passportState(c.status, c.expiresAt);
            return (
              <li
                key={c.capability}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-bone-200">{capabilityLabel(c.capability)}</p>
                  {c.expiresAt ? (
                    <p className="text-xs text-bone-500">Expires {formatDate(c.expiresAt)}</p>
                  ) : null}
                </div>
                <PassportStateChip state={state} />
              </li>
            );
          })}
        </ul>
        <Link
          href="/account/singha-id"
          className="mt-3 inline-block text-xs font-medium text-gold-400 hover:text-gold-300"
        >
          Manage Singha ID →
        </Link>
      </div>
    );
  }
  return (
    <Metric
      label="Capabilities"
      value={verification.total}
      flow={verification.byStatus}
      href="/account/singha-id"
      linkLabel="Manage Singha ID"
    />
  );
}

export function ExchangeActivity() {
  const { token, loading: authLoading } = useAuth();
  const [data, setData] = useState<EvoDashboard | null>(null);
  const [buyer, setBuyer] = useState<DashboardProjection | null>(null);
  const [caps, setCaps] = useState<CapabilityGrant[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading || !token) return;
    let alive = true;
    setStatus('loading');
    setError(null);
    Promise.all([
      fetchEvoDashboard(token),
      // Buyer command-centre projection (pack doc 05) — richer, per-lot detail (stage/deadline)
      // than the aggregate above. Never throws: resolves null when the projection isn't shipped.
      fetchDashboard(token),
      // Best-effort: capability grants power the Documents lane + verification attention items,
      // but their absence must never block the rest of the Command Centre from rendering.
      fetchCapabilities(token).catch(() => [] as CapabilityGrant[]),
    ])
      .then(([evo, projection, grants]) => {
        if (!alive) return;
        setData(evo);
        setBuyer(projection);
        setCaps(grants);
        setStatus('idle');
      })
      .catch((err: unknown) => {
        if (alive) {
          setStatus('error');
          setError(friendlyMessage(err, "We couldn't load your activity."));
        }
      });
    return () => {
      alive = false;
    };
  }, [token, authLoading, reloadKey]);

  const attentionItems = useMemo(
    () => (data ? buildAttentionItems(data, buyer, caps) : []),
    [data, buyer, caps],
  );

  if (!authLoading && !token)
    return (
      <SignInPrompt
        title="Your exchange activity"
        description="Sign in to see your buying, selling and verification across Singha."
        next="/account/activity"
      />
    );

  const buyingHasAuctionActivity = buyer ? buyer.groups.some((g) => g.items.length > 0) : false;
  const buyingEmpty =
    !!data &&
    data.buying.watching === 0 &&
    data.buying.offers.total === 0 &&
    !buyingHasAuctionActivity;
  const sellingEmpty = !!data && data.selling.supplyProgrammes.total === 0;
  const wantedEmpty =
    !!data &&
    data.buying.procurementRequests.total === 0 &&
    data.selling.procurementResponses.total === 0;

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Command centre</p>
        <h1 className="mt-1 font-serif text-3xl text-bone">Your exchange activity</h1>
        <p className="mt-2 max-w-2xl text-bone-400">
          Everything you&rsquo;re buying, selling and verifying across Singha — led by what needs
          your attention first.
        </p>
      </header>

      {status === 'loading' ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-24 w-full rounded-none" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-none" />
            ))}
          </div>
        </div>
      ) : status === 'error' ? (
        <Card className="mt-8 py-10 text-center">
          <p className="text-bone-300">{error ?? "We couldn't load your activity."}</p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      ) : data ? (
        <div className="mt-8 space-y-12">
          <AttentionSection items={attentionItems} />

          <Lane
            id="buying"
            title="Buying"
            subtitle="Auctions you're bidding on, lots you're watching and the offers you've made."
          >
            {buyingEmpty ? (
              <EmptyState
                title="Nothing here yet"
                description="Watch a lot, place a bid or make an offer and it appears here."
                action={
                  <Link href="/catalogue">
                    <Button variant="outline">Browse the catalogue</Button>
                  </Link>
                }
              />
            ) : (
              <>
                {buyer && buyingHasAuctionActivity ? (
                  <div className="mb-6">
                    <h3 className="font-display text-sm font-semibold text-bone-200">Auctions</h3>
                    <div className="mt-3">
                      <AuctionStepper groups={buyer.groups} />
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label="Watching" value={data.buying.watching} />
                  <Metric
                    label="Offers"
                    value={data.buying.offers.total}
                    flow={data.buying.offers.byStatus}
                    href="/account/commercial-offers"
                    linkLabel="View offers"
                  />
                </div>
              </>
            )}
          </Lane>

          <Lane id="selling" title="Selling" subtitle="Your supply programmes and what buyers see.">
            {sellingEmpty ? (
              <EmptyState
                title="No supply programmes yet"
                description="Set up a supply programme to offer recurring stock to buyers."
                action={
                  <Link href="/sell/supply">
                    <Button variant="outline">Set up supply</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Metric
                  label="Supply programmes"
                  value={data.selling.supplyProgrammes.total}
                  flow={data.selling.supplyProgrammes.byStatus}
                  href="/sell/supply"
                  linkLabel="Manage supply"
                />
              </div>
            )}
          </Lane>

          <Lane
            id="wanted"
            title="Wanted"
            subtitle="Requests you've posted and proposals you've sent to others."
          >
            {wantedEmpty ? (
              <EmptyState
                title="Nothing posted yet"
                description="Post what you need, or respond to a Wanted request with a priced proposal."
                action={
                  <Link href="/wanted">
                    <Button variant="outline">Go to Wanted</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Metric
                  label="Requests posted"
                  value={data.buying.procurementRequests.total}
                  flow={data.buying.procurementRequests.byStatus}
                  href="/wanted/procurement"
                  linkLabel="View requests"
                />
                <Metric
                  label="Proposals sent"
                  value={data.selling.procurementResponses.total}
                  flow={data.selling.procurementResponses.byStatus}
                />
              </div>
            )}
          </Lane>

          {/* Logistics only renders when the buyer command-centre projection is available — the
              aggregate `/dashboard` read-model has no collection/shipment field at all. */}
          {buyer ? (
            <Lane
              id="logistics"
              title="Logistics"
              subtitle="Collection and delivery for your won lots."
            >
              {buyer.strip.readyForPickup > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric
                    label="Ready for pickup"
                    value={buyer.strip.readyForPickup}
                    href="/dashboard"
                    linkLabel="Arrange collection"
                  />
                </div>
              ) : (
                <EmptyState
                  title="Nothing to collect yet"
                  description="Won lots ready for pickup or delivery will appear here."
                />
              )}
            </Lane>
          ) : null}

          <Lane
            id="documents"
            title="Documents"
            subtitle="Verification and capabilities that unlock buying, selling and trade."
          >
            <DocumentsPanel caps={caps} verification={data.verification} />
          </Lane>
        </div>
      ) : null}
    </div>
  );
}
