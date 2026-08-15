import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiGet, fetchCatalogueV2, type CatalogueCardV2, type MarketPulse } from '../lib/api';
import { formatMoney } from '../lib/format';
import { FeaturedSection } from '../components/FeaturedSection';
import { HeroShowcase } from '../components/HeroShowcase';
import { HomeHeroBackdrop } from '../components/HomeHeroBackdrop';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Singha Auctions — Sri Lanka’s trusted asset exchange',
  description:
    'Vehicles, machinery, gems, property and business assets — discovered, inspected and won through transparent, server-authoritative auctions.',
  openGraph: {
    title: 'Singha Auctions — Sri Lanka’s trusted asset exchange',
    description:
      'Transparent timed, live and sealed auctions for vehicles, machinery, gems and property.',
    type: 'website',
  },
};

/**
 * Homepage — editorial and lightweight (pack doc 15). Hero → featured items →
 * featured event → categories → Market Pulse → trust → Sell CTA. It never
 * renders the full catalogue and never downloads all inventory: only 8 featured
 * cards + the Market Pulse summary. Visual language is deliberately restrained —
 * premium dark base, sparing red/gold accents, generous space — not the gaming
 * HUD used on operator surfaces.
 */

const CATEGORIES = [
  { label: 'Vehicles', slug: 'vehicles' },
  { label: 'Machinery & Equipment', slug: 'machinery' },
  { label: 'Gems & Jewellery', slug: 'gems' },
  { label: 'Property', slug: 'property' },
  { label: 'Business Assets', slug: 'business' },
  { label: 'Stock & Bulk', slug: 'bulk' },
  { label: 'Agriculture', slug: 'agriculture' },
  { label: 'General Assets', slug: 'general' },
];

const PULSE_FALLBACK = [
  {
    tag: 'Market movement',
    text: 'Used commercial vehicle demand up across the Western Province this quarter.',
  },
  {
    tag: 'Notable result',
    text: 'Machinery clearance achieved 96% sell-through at last week’s timed event.',
  },
  { tag: 'Upcoming', text: 'Gem & jewellery live auction scheduled — registration opening soon.' },
];

const TRUST = [
  {
    title: 'Server-authoritative bidding',
    text: 'The auction engine is the single source of truth. Every bid is validated, sequenced and recorded — the screen is never the record.',
  },
  {
    title: 'Append-only evidence trail',
    text: 'Bids, payments and settlement are immutable ledgers. Nothing in the financial history can be quietly edited or deleted.',
  },
  {
    title: 'Verified sellers & inspection',
    text: 'Banks, corporates and government sellers with documented ownership, condition and viewing arrangements before you commit.',
  },
];

export default async function HomePage() {
  const [featured, pulse] = await Promise.all([
    fetchCatalogueV2({ featured: true, limit: 8, sort: 'ending' })
      .then((r) => r.items)
      .catch(() => [] as CatalogueCardV2[]),
    apiGet<MarketPulse>('/intelligence/market-pulse').catch(() => null),
  ]);

  // Market Pulse "news" for the hero reel — live figures when available, else editorial fallbacks.
  const pulseNews =
    pulse && pulse.salesCount > 0
      ? [
          {
            eyebrow: 'Market Pulse',
            text: `${pulse.salesCount} lots sold in the last ${pulse.windowDays} days`,
          },
          {
            eyebrow: 'Total cleared',
            text: `${formatMoney(pulse.totalMinor)} across recent sales`,
          },
          ...pulse.categories.slice(0, 3).map((c) => ({
            eyebrow: c.category,
            text: `${formatMoney(c.avgMinor)} average — recent results`,
          })),
        ]
      : PULSE_FALLBACK.map((p) => ({ eyebrow: p.tag, text: p.text }));

  return (
    <>
      {/* Hero — cinematic, editorial, restrained */}
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        {/* Sparse atmospheric depth — a single soft radial, not a red grid.
            (Fallback base; the V3 image backdrop below covers it when enabled.) */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(80% 60% at 78% 8%, rgba(31,160,85,0.10), transparent 60%), radial-gradient(50% 50% at 8% 100%, rgba(201,162,75,0.07), transparent 65%)',
          }}
        />
        {/* V3 cinematic image backdrop — gated on v3VisualArchitecture, CSP-safe (self). */}
        <HomeHeroBackdrop />
        <div className="container-wide relative flex min-h-[85vh] flex-col justify-center py-20 sm:py-24 lg:min-h-[90vh]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left — editorial copy */}
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-red-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                Live · timed · sealed auctions
              </p>
              <h1 className="mt-6 max-w-2xl font-serif text-5xl font-extrabold leading-[1.02] tracking-tight text-bone sm:text-6xl xl:text-7xl">
                Sri Lanka’s trusted{' '}
                <span className="bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent">
                  asset exchange
                </span>
                .
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-bone-300/90">
                Vehicles, machinery, gems, property and business assets — discovered, inspected and
                won through transparent, real-time auctions.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/catalogue">
                  <Button variant="primary">Explore catalogue</Button>
                </Link>
                <Link href="/live">
                  <Button variant="outline">Watch live</Button>
                </Link>
              </div>
              <div className="mt-10 h-px w-full max-w-md rule-fade" />
              <p className="mt-5 text-sm text-bone-500">
                Institutional transparency · Verified sellers · Server-authoritative bidding
              </p>
            </div>
            {/* Right — auto-scrolling 3D reel: featured lots mixed with Market Pulse news */}
            <HeroShowcase items={featured} news={pulseNews} />
          </div>
        </div>
      </section>

      {/* Featured items — real media, sale-aware cards */}
      <section className="container-page py-20">
        <div className="mb-9 flex items-end justify-between">
          <div>
            <p className="eyebrow">Open now</p>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-bone sm:text-4xl">
              Featured items
            </h2>
            <p className="mt-1 text-sm text-bone-500">Curated lots open right now.</p>
          </div>
          <Link
            href="/catalogue"
            className="group text-sm font-medium text-gold-300 transition-colors hover:text-gold-200"
          >
            View all{' '}
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        {featured.length > 0 ? (
          // Data fetched server-side; FeaturedSection picks the cinematic reel
          // (featuredReelV3) or the static grid client-side (pack doc 09).
          <FeaturedSection items={featured} />
        ) : (
          <Card>
            <p className="text-bone-400">
              Featured lots are being curated. {''}
              <Link href="/catalogue" className="text-gold-400">
                Browse the full catalogue →
              </Link>
            </p>
          </Card>
        )}
      </section>

      {/* Featured event */}
      <section className="container-page pb-20">
        <Card className="relative overflow-hidden p-8 sm:p-12">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Chip tone="live">Singha Live</Chip>
              <h2 className="mt-4 font-serif text-3xl font-bold text-bone">
                Featured live auction
              </h2>
              <p className="mt-3 max-w-lg leading-relaxed text-bone-400">
                Multi-camera broadcast with online, floor and phone bidding reconciled into one
                unified, auditable ledger.
              </p>
            </div>
            <Link href="/live">
              <Button variant="primary">Enter live room</Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Explore categories */}
      <section className="border-y border-white/[0.07] bg-coal-950/40">
        <div className="container-page py-20">
          <p className="eyebrow">Browse by type</p>
          <h2 className="mb-9 mt-2 font-serif text-3xl font-bold tracking-tight text-bone sm:text-4xl">
            Explore categories
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/catalogue?category=${category.slug}`}
                className="card-premium group flex items-center justify-between p-5"
              >
                <span className="font-display text-sm font-semibold text-bone-200 transition-colors group-hover:text-bone">
                  {category.label}
                </span>
                <span className="text-gold-400 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Market Pulse */}
      <section className="container-page py-20">
        <div className="mb-9 flex items-center gap-3">
          <h2 className="font-serif text-3xl font-bold text-bone">Market Pulse</h2>
          <Chip tone="gold">Editorial</Chip>
        </div>
        {pulse && pulse.salesCount > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gold-400">
                  Sold ({pulse.windowDays}d)
                </span>
                <span className="tabular font-display text-2xl font-bold text-bone">
                  {pulse.salesCount} lots
                </span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gold-400">
                  Total value
                </span>
                <span className="tabular font-display text-2xl font-bold text-bone">
                  {formatMoney(pulse.totalMinor)}
                </span>
              </Card>
              <Card className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gold-400">
                  Top category
                </span>
                <span className="font-display text-2xl font-bold capitalize text-bone">
                  {pulse.categories[0]?.category ?? '—'}
                </span>
              </Card>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pulse.categories.slice(0, 4).map((c) => (
                <Card key={c.category} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-bone-300">{c.category}</span>
                  <span className="tabular text-sm font-semibold text-gold-400">
                    {formatMoney(c.avgMinor)} avg
                  </span>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              {PULSE_FALLBACK.map((entry) => (
                <Card key={entry.tag} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold-400">
                    {entry.tag}
                  </span>
                  <p className="text-sm leading-relaxed text-bone-300">{entry.text}</p>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-xs text-bone-600">
              Market Pulse publishes only source-backed, reviewed content (pack doc 13). Sample copy
              shown until live results are available.
            </p>
          </>
        )}
      </section>

      {/* Trust & transparency */}
      <section className="border-t border-white/10 bg-coal-950/40">
        <div className="container-page py-20">
          <h2 className="mb-9 font-serif text-3xl font-bold text-bone">
            Built for institutional trust
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TRUST.map((t) => (
              <Card key={t.title} className="flex flex-col gap-3">
                <h3 className="font-display text-base font-semibold text-bone">{t.title}</h3>
                <p className="text-sm leading-relaxed text-bone-400">{t.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sell with Singha */}
      <section className="border-t border-white/10">
        <div className="container-page flex flex-col items-start gap-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold text-bone">Sell with Singha</h2>
            <p className="mt-3 max-w-lg leading-relaxed text-bone-400">
              Banks, corporates, government and private sellers — disposal with an institutional
              evidence trail from listing to settlement.
            </p>
          </div>
          <Link href="/sell">
            <Button variant="gold">Start selling</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
