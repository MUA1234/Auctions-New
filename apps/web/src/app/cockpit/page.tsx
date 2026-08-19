'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import {
  askCockpit,
  fetchCockpit,
  type AuctionLot,
  type Cockpit,
  type CockpitAnswer,
  type Lot,
} from '../../lib/cockpit';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';

/**
 * The Singha Cockpit — ONE adaptive, signed-in home for every Singha Client (unified-identity pass).
 * A single Client may simultaneously buy, bid, sell, supply, post RFQs and use services; this is the
 * one place they see all of it, ordered by what they actually do (emphasis). There is NO Buyer/Seller
 * mode switch. Every figure is read live from the authoritative `/api/v2/me/cockpit` read-model — the
 * page holds no financial state of its own.
 */
export default function CockpitPage() {
  const { token, loading } = useAuth();
  const [data, setData] = useState<Cockpit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    try {
      setData(await fetchCockpit(t));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

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

  const { identity, accountHealth: h, needsAttention } = data;
  const sellerFirst = identity.emphasis === 'seller';
  const hasSelling = identity.roles.includes('seller');

  const Buying = <BuyingSection data={data} />;
  const Selling = hasSelling ? <SellingSection data={data} /> : null;

  return (
    <div className="container-page space-y-8 py-14">
      {/* Header — one identity, all capabilities. */}
      <header>
        <p className="text-xs uppercase tracking-widest text-bone-500">Singha Cockpit</p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-bone">
          {identity.legalName ?? 'Your account'}
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
            {identity.emphasis === 'both' ? 'buying & selling' : `mostly ${identity.emphasis}`}
          </span>
        </div>
      </header>

      <AccountHealthCard health={h} />
      <AskSingha token={token} />

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

      <OtherSections data={data} />
    </div>
  );
}

// ── Account Health (deterministic facts) ──────────────────────────────────────
function AccountHealthCard({ health: h }: { health: Cockpit['accountHealth'] }) {
  const cur = h.currency;
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
            h.bidCapacity.hasFacility
              ? formatMoney(h.bidCapacity.availableMinor, cur)
              : 'No facility'
          }
          accent
          hint={
            h.bidCapacity.hasFacility
              ? `${formatMoney(h.bidCapacity.committedMinor, cur)} committed`
              : 'Add a deposit to unlock'
          }
        />
        <Metric
          label="Amounts to pay"
          value={formatMoney(h.amountsToPay.totalMinor, cur)}
          muted={h.amountsToPay.totalMinor === 0}
          hint={
            h.amountsToPay.overdueCount
              ? `${formatMoney(h.amountsToPay.overdueMinor, cur)} overdue`
              : undefined
          }
          danger={h.amountsToPay.overdueCount > 0}
        />
        <Metric
          label="Seller proceeds"
          value={formatMoney(h.sellerProceeds.settledMinor, cur)}
          hint={
            h.sellerProceeds.pendingCount
              ? `${formatMoney(h.sellerProceeds.pendingMinor, cur)} pending`
              : 'settled'
          }
        />
        <Metric
          label="Deposits / security"
          value={formatMoney(h.security.verifiedMinor, cur)}
          hint={`${h.security.count} instrument${h.security.count === 1 ? '' : 's'}`}
        />
      </div>
      {h.overdueActions.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-white/10 pt-3">
          {h.overdueActions.map((a) => (
            <li key={a.ref} className="text-xs text-outbid">
              • {a.label}
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
  const cur = data.accountHealth.currency;
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
            render={(l) => auctionLine(l as AuctionLot, cur)}
          />
          <LotList
            title="Payment due"
            lots={b.invoices.filter((i) => i.status === 'issued')}
            render={(i) => `${i.reference} · ${formatMoney(i.amountDueMinor, cur)}`}
          />
          <LotList title="Watching" lots={b.watched} render={(l) => l.reference} />
          <LotList
            title="Purchases"
            lots={b.purchases}
            render={(p) => `${p.reference} · ${formatMoney(p.amountMinor, cur)}`}
          />
        </div>
      )}
    </Section>
  );
}

// ── Selling ───────────────────────────────────────────────────────────────────
function SellingSection({ data }: { data: Cockpit }) {
  const s = data.selling;
  const cur = data.accountHealth.currency;
  return (
    <Section title="Selling" href="/sell/new" hrefLabel="List an item">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile label="Active listings" value={s.summary.activeListings} />
        <StatTile label="Drafts" value={s.summary.drafts} />
        <StatTile label="Offers received" value={s.summary.offersReceived} tone="gold" />
        <StatTile label="Sales" value={s.summary.sales} />
        <StatTile
          label="Proceeds pending"
          value={formatMoney(s.summary.pendingProceedsMinor, cur)}
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
            render={(o) => `${o.reference} · ${formatMoney(o.amountMinor, cur)} · ${o.status}`}
          />
          <LotList
            title="Sales"
            lots={s.sales}
            render={(sale) =>
              `${sale.reference} · ${formatMoney(sale.amountMinor, cur)}${sale.settled ? '' : ' · unsettled'}`
            }
          />
          <LotList
            title="Settlements (proceeds)"
            lots={s.settlements}
            render={(x) => `${x.reference} · net ${formatMoney(x.netMinor, cur)}`}
          />
        </div>
      )}
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

function auctionLine(l: AuctionLot, cur: string): string {
  return `${l.reference} · ${formatMoney(l.currentBidMinor, cur)} (your max ${formatMoney(l.myMaxMinor, cur)})`;
}
