'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import {
  askCockpit,
  fetchCockpit,
  formatAmount,
  formatBuckets,
  type AuctionLot,
  type Cockpit,
  type CockpitAnswer,
  type Lot,
  type TimelineEntry,
} from '../../lib/cockpit';
import { useAuth } from '../../lib/auth';

/**
 * The Singha Cockpit — ONE adaptive, signed-in home for every Singha Client (unified-identity +
 * multi-currency correction pass). A single Client may simultaneously buy, bid, sell, supply, post
 * RFQs and use services; this is the one place they see all of it, ordered by what they actually do
 * (emphasis). There is NO Buyer/Seller mode switch. The one human keeps ONE Client ID but may act
 * for an authorised Organisation via the context selector; personal and org state are never mixed.
 * Every figure is read live from the authoritative `/api/v2/me/cockpit` read-model — the page holds
 * no financial state of its own. Money is always per-currency; minor units are never summed across
 * currencies.
 */
export default function CockpitPage() {
  const { token, loading } = useAuth();
  const [data, setData] = useState<Cockpit | null>(null);
  const [org, setOrg] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string, orgId?: string) => {
    try {
      setData(await fetchCockpit(t, orgId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (token) void load(token, org);
  }, [token, org, load]);

  if (loading) return null;
  if (!token)
    return (
      <div className="container-page py-14">
        <h1 className="font-serif text-3xl font-bold text-bone">Your Singha Cockpit</h1>
        <p className="mt-2 text-bone-400">
          <Link href="/login?next=/cockpit" className="text-amber-200 underline">
            Sign in
          </Link>{' '}
          to see everything on your one Singha account — buying, selling and account health.
        </p>
      </div>
    );
  if (error)
    return (
      <div className="container-page py-14">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  if (!data)
    return <div className="container-page py-14 text-sm text-bone-500">Loading your cockpit…</div>;

  const { identity, accountHealth: h, needsAttention, context } = data;
  const inOrg = context.kind === 'organization';
  const sellerFirst = inOrg || identity.emphasis === 'seller';
  const hasSelling = inOrg || identity.roles.includes('seller');

  const Buying = inOrg ? null : <BuyingSection data={data} />;
  const Selling = hasSelling ? <SellingSection data={data} /> : null;

  return (
    <div className="container-page space-y-8 py-14">
      {/* Header — one identity, all capabilities, one Client ID across every context. */}
      <header>
        <p className="text-xs uppercase tracking-widest text-bone-500">Singha Cockpit</p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-bone">
          {inOrg ? context.organizationName : (identity.legalName ?? 'Your account')}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip tone="gold">{identity.clientReference ?? '—'}</Chip>
          {identity.roles.map((r) => (
            <Chip key={r}>{r}</Chip>
          ))}
          <Chip tone={identity.kycStatus === 'verified' ? 'win' : 'neutral'}>
            KYC {identity.kycStatus}
          </Chip>
          <span className="text-xs text-bone-600">
            One Singha ID ·{' '}
            {inOrg
              ? 'acting for an organisation'
              : identity.emphasis === 'both'
                ? 'buying & selling'
                : `mostly ${identity.emphasis}`}
          </span>
        </div>
        <ContextSelector
          organizations={data.organizations}
          current={org}
          onChange={(next) => setOrg(next)}
        />
      </header>

      <AccountHealthCard health={h} />
      {!inOrg ? <AskSingha token={token} /> : null}

      {needsAttention.length > 0 ? (
        <Section title="Needs your attention" count={needsAttention.length}>
          <div className="grid gap-2">
            {needsAttention.map((a, i) => (
              <div
                key={`${a.ref}:${i}`}
                className="flex items-center justify-between rounded-lg border border-outbid/20 bg-white/[0.02] px-4 py-2.5"
              >
                <p className="text-sm text-bone-200">{a.label}</p>
                <Chip tone="gold">{a.kind.replace(/_/g, ' ')}</Chip>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Adaptive order: active sellers see selling first; everyone else buying first. */}
      {sellerFirst ? (
        <>
          {Selling}
          {Buying}
        </>
      ) : (
        <>
          {Buying}
          {Selling}
        </>
      )}

      <TimelineSection entries={data.timeline.entries} />
      <OtherSections data={data} />
    </div>
  );
}

// ── Context selector — one human, personal + each authorised organisation ─────
function ContextSelector({
  organizations,
  current,
  onChange,
}: {
  organizations: Cockpit['organizations'];
  current: string | undefined;
  onChange: (org: string | undefined) => void;
}) {
  if (!organizations.length) return null;
  const Btn = ({ id, label }: { id: string | undefined; label: string }) => {
    const active = current === id;
    return (
      <button
        onClick={() => onChange(id)}
        className={`rounded-full border px-3 py-1 text-xs transition ${
          active
            ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
            : 'border-white/10 text-bone-400 hover:border-amber-300/30 hover:text-bone-200'
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-bone-600">Acting as</span>
      <Btn id={undefined} label="Personal" />
      {organizations.map((o) => (
        <Btn key={o.organizationId} id={o.organizationId} label={o.legalName} />
      ))}
    </div>
  );
}

// ── Account Health (deterministic facts, per-currency, never cross-summed) ────
function AccountHealthCard({ health: h }: { health: Cockpit['accountHealth'] }) {
  const cap = h.bidCapacity;
  return (
    <Card className={h.status === 'attention' ? 'border-outbid/30' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-bone">Account health</h2>
        <Chip tone={h.status === 'clear' ? 'win' : 'gold'}>
          {h.status === 'clear' ? 'All clear' : 'Needs attention'}
        </Chip>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Available to bid"
          value={
            cap?.hasFacility
              ? formatAmount({
                  currency: cap.currency,
                  exponent: cap.exponent,
                  minor: cap.availableMinor,
                })
              : 'No facility'
          }
          accent
          hint={
            cap?.hasFacility
              ? `${formatAmount({ currency: cap.currency, exponent: cap.exponent, minor: cap.committedMinor })} committed`
              : 'Add a deposit to unlock'
          }
        />
        <Metric
          label="Amounts to pay"
          value={formatBuckets(h.amountsToPay.byCurrency, 'total')}
          muted={h.amountsToPay.count === 0}
          hint={
            h.amountsToPay.overdueCount
              ? `${formatBuckets(h.amountsToPay.byCurrency, 'overdue')} overdue`
              : undefined
          }
          danger={h.amountsToPay.overdueCount > 0}
        />
        <Metric
          label="Seller proceeds"
          value={formatBuckets(h.sellerProceeds.byCurrency, 'settled')}
          hint={
            h.sellerProceeds.pendingCount
              ? `${formatBuckets(h.sellerProceeds.byCurrency, 'pending')} pending`
              : 'settled'
          }
        />
        <Metric
          label="Deposits / security"
          value={formatBuckets(h.security.byCurrency, 'verified')}
          hint={`${h.security.count} instrument${h.security.count === 1 ? '' : 's'}`}
        />
      </div>
      {h.display ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-[11px] text-bone-600">
          ≈{' '}
          {formatAmount({
            currency: h.display.currency,
            exponent: h.display.exponent,
            minor: h.display.amountsToPayMinor,
          })}{' '}
          to pay in {h.display.currency} · informational only, not binding
          {h.display.stale ? ' (rate stale)' : ''}. Original transaction-currency amounts are
          authoritative.
        </p>
      ) : null}
      {h.overdueActions.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-white/10 pt-3">
          {h.overdueActions.map((a) => (
            <li key={a.ref} className="text-xs text-outbid">
              • {a.label}
              {a.amount ? ` · ${formatAmount(a.amount)}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

// ── Contextual Singha AI ──────────────────────────────────────────────────────
const QUICK = [
  'What needs my attention?',
  'How much can I bid?',
  'What am I winning?',
  'What money do I owe?',
  'What seller proceeds are pending?',
  'Where are my purchases?',
];
function AskSingha({ token }: { token: string }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<CockpitAnswer | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    try {
      setAnswer(await askCockpit(token, question));
    } catch {
      setAnswer(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-sm font-semibold text-bone">Ask Singha</h2>
      <p className="mt-1 text-xs text-bone-500">
        Singha interprets your question and answers from your authoritative account facts.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(q)}
          placeholder="e.g. How much can I bid?"
          className="w-full rounded-md border border-white/10 bg-coal-900/60 px-3 py-2 text-sm text-bone placeholder:text-bone-600 focus:border-red-500/40 focus:outline-none"
        />
        <Button onClick={() => ask(q)} disabled={busy || !q.trim()}>
          {busy ? '…' : 'Ask'}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map((question) => (
          <button
            key={question}
            onClick={() => {
              setQ(question);
              void ask(question);
            }}
            className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-bone-400 hover:border-amber-300/30 hover:text-bone-200"
          >
            {question}
          </button>
        ))}
      </div>
      {answer ? (
        <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-4 py-3">
          <p className="text-sm text-bone-100">{answer.reply}</p>
          <p className="mt-1 text-[11px] text-bone-600">{answer.disclaimer}</p>
        </div>
      ) : null}
    </Card>
  );
}

// ── Buying ────────────────────────────────────────────────────────────────────
function BuyingSection({ data }: { data: Cockpit }) {
  const b = data.buying;
  const empty =
    b.summary.activeBids +
      b.summary.watched +
      b.summary.purchases +
      b.offers.length +
      b.eois.length ===
    0;
  return (
    <Section title="Buying" href="/explore" hrefLabel="Browse lots">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile label="Active bids" value={b.summary.activeBids} />
        <StatTile label="Winning" value={b.summary.winning} tone="win" />
        <StatTile label="Outbid" value={b.summary.outbid} tone="outbid" />
        <StatTile label="Watched" value={b.summary.watched} />
        <StatTile label="Purchases" value={b.summary.purchases} />
      </div>
      {empty ? (
        <p className="text-sm text-bone-500">
          No buying activity yet — explore the catalogue to start.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <LotList
            title="Live bids"
            lots={b.activeBids}
            render={(l) => auctionLine(l as AuctionLot)}
          />
          <LotList
            title="Payment due"
            lots={b.invoices.filter((i) => i.status === 'issued')}
            render={(i) => `${i.reference} · ${formatAmount(i.amountDue)}`}
          />
          <LotList title="Watching" lots={b.watched} render={(l) => l.reference} />
          <LotList
            title="Purchases"
            lots={b.purchases}
            render={(p) => `${p.reference} · ${formatAmount(p.amount)}`}
          />
        </div>
      )}
    </Section>
  );
}

// ── Selling ───────────────────────────────────────────────────────────────────
function SellingSection({ data }: { data: Cockpit }) {
  const s = data.selling;
  return (
    <Section title="Selling" href="/sell/new" hrefLabel="List an item">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile label="Active listings" value={s.summary.activeListings} />
        <StatTile label="Drafts" value={s.summary.drafts} />
        <StatTile label="Offers received" value={s.summary.offersReceived} tone="gold" />
        <StatTile label="Sales" value={s.summary.sales} />
        <StatTile
          label="Proceeds pending"
          value={formatBuckets(s.summary.pendingProceeds, 'pending')}
          wide
        />
      </div>
      {s.summary.activeListings + s.summary.drafts + s.summary.sales === 0 ? (
        <p className="text-sm text-bone-500">
          You haven’t listed anything yet — selling is part of your one Singha account.{' '}
          <Link href="/sell/new" className="text-amber-200 underline">
            List an item
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <LotList
            title="Active listings"
            lots={s.activeListings}
            render={(l) => `${l.reference} · ${l.status}`}
          />
          <LotList
            title="Offers received"
            lots={s.offersReceived}
            render={(o) => `${o.reference} · ${formatAmount(o.amount)} · ${o.status}`}
          />
          <LotList
            title="Sales"
            lots={s.sales}
            render={(sale) =>
              `${sale.reference} · ${formatAmount(sale.amount)}${sale.settled ? '' : ' · unsettled'}`
            }
          />
          <LotList
            title="Settlements (proceeds)"
            lots={s.settlements}
            render={(x) => `${x.reference} · net ${formatAmount(x.net)}`}
          />
        </div>
      )}
    </Section>
  );
}

// ── Unified Activity Timeline (projection over authoritative events) ──────────
const GROUP_TONE: Record<string, 'win' | 'outbid' | 'gold' | 'neutral'> = {
  buying: 'neutral',
  selling: 'win',
  bidding: 'gold',
  payment: 'outbid',
};
function TimelineSection({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return null;
  return (
    <Section title="Activity" count={entries.length}>
      <ol className="relative space-y-2 border-l border-white/10 pl-4">
        {entries.slice(0, 20).map((e, i) => (
          <li key={`${e.refType}:${e.refId}:${i}`} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-300/50" />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-bone-200">
                  {e.title}
                  {e.listing ? ` · ${e.listing.reference}` : ''}
                </p>
                <p className="text-[11px] text-bone-600">
                  {formatWhen(e.at)}
                  {e.amount ? ` · ${formatAmount(e.amount)}` : ''}
                </p>
              </div>
              <Chip tone={GROUP_TONE[e.group] ?? 'neutral'}>{e.group}</Chip>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── Other domains ─────────────────────────────────────────────────────────────
function OtherSections({ data }: { data: Cockpit }) {
  const { procurement, supply, conversations, notifications } = data;
  const anything =
    procurement.requests.length +
    supply.programmes.length +
    conversations.count +
    notifications.recent.length;
  if (anything === 0) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {procurement.requests.length ? (
        <MiniList
          title="Procurement / RFQs"
          items={procurement.requests.map((r) => `${r.title} · ${r.status}`)}
        />
      ) : null}
      {supply.programmes.length ? (
        <MiniList
          title="Supply programmes"
          items={supply.programmes.map((p) => `${p.product} · ${p.status}`)}
        />
      ) : null}
      {conversations.count ? (
        <MiniList
          title="Conversations"
          items={conversations.recent.map((c) => `${c.channel} · ${c.status}`)}
        />
      ) : null}
      {notifications.recent.length ? (
        <MiniList
          title="Notifications"
          items={notifications.recent.slice(0, 6).map((n) => n.title)}
        />
      ) : null}
    </div>
  );
}

// ── Presentational helpers ────────────────────────────────────────────────────
function Section({
  title,
  count,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-bone">
          {title}
          {count != null ? <span className="ml-2 text-base text-bone-500">{count}</span> : null}
        </h2>
        {href ? (
          <Link href={href} className="text-xs text-amber-200 hover:underline">
            {hrefLabel} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
  tone,
  wide,
}: {
  label: string;
  value: number | string;
  tone?: 'win' | 'outbid' | 'gold';
  wide?: boolean;
}) {
  const color =
    tone === 'win'
      ? 'text-live'
      : tone === 'outbid'
        ? 'text-outbid'
        : tone === 'gold'
          ? 'text-amber-100'
          : 'text-bone';
  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.02] p-3 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}
    >
      <p className="text-[11px] uppercase tracking-wider text-bone-500">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function LotList<T extends Lot>({
  title,
  lots,
  render,
}: {
  title: string;
  lots: T[];
  render: (lot: T) => string;
}) {
  if (!lots.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-bone-500">{title}</p>
      <ul className="space-y-1">
        {lots.slice(0, 8).map((l, i) => (
          <li key={`${l.listingId}:${i}`} className="truncate text-sm text-bone-200">
            {render(l)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-bone-500">{title}</p>
      <ul className="space-y-1">
        {items.slice(0, 6).map((t, i) => (
          <li key={i} className="truncate text-sm text-bone-200">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
  muted,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-bone-500">{label}</p>
      <p
        className={`mt-1 font-display text-lg font-semibold tabular-nums ${
          danger ? 'text-outbid' : accent ? 'text-amber-100' : muted ? 'text-bone-400' : 'text-bone'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-bone-500">{hint}</p> : null}
    </div>
  );
}

function auctionLine(l: AuctionLot): string {
  const bid = formatAmount({
    currency: l.currency,
    exponent: l.exponent,
    minor: String(l.currentBidMinor),
  });
  const myMax = formatAmount({
    currency: l.currency,
    exponent: l.exponent,
    minor: String(l.myMaxMinor),
  });
  return `${l.reference} · ${bid} (your max ${myMax})`;
}

function formatWhen(at: string | null | undefined): string {
  if (!at) return '';
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}
