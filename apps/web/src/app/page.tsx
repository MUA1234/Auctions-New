import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiGet, fetchCatalogueV2, type CatalogueCardV2, type MarketPulse } from '../lib/api';
import { formatMoney } from '../lib/format';
import { FeaturedSection } from '../components/FeaturedSection';
import { HeroShowcase } from '../components/HeroShowcase';
import { SinghaLivingBackground } from '../components/living-background/SinghaLivingBackground';
import { CategoryCards } from '../components/CategoryCards';
import { HomeSearchIntent } from '../components/home/HomeSearchIntent';
import { HomeWaysToTransact } from '../components/home/HomeWaysToTransact';
import { HomeWanted } from '../components/home/HomeWanted';
import { HomeAttentionRail } from '../components/home/HomeAttentionRail';
import { HomeLocalOpportunities } from '../components/home/HomeLocalOpportunities';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Singha — the trusted exchange for assets & commodities',
  description:
    'Vehicles, machinery, gems, property, produce and commodities — discovered, inspected and transacted through offers, buy now, tenders and auctions, on transparent, server-authoritative records.',
  openGraph: {
    title: 'Singha — the trusted exchange for assets & commodities',
    description:
      'Transparent offers, buy now, tenders and auctions for vehicles, machinery, gems, property, produce and commodities.',
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
    title: 'Your bid always counts',
    text: 'Every bid is checked and recorded the instant you place it — no lost bids, no last-second surprises. What you see is exactly what stands.',
  },
  {
    title: 'A price that stays put',
    text: 'Once made, bids, payments and settlement are locked — so the price you win at is the price that holds. Nothing is quietly changed after the fact.',
  },
  {
    title: 'Know who you’re buying from',
    text: 'Sellers — banks, corporates and government bodies — come with documented ownership, condition and viewing arrangements, so you can commit with confidence.',
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
      {/* Fixed, cinematic "living background" (gated on v3VisualArchitecture). Pinned to
          the viewport with NO scroll coupling; the opaque content sheet below scrolls up
          and over it. Replaces the old static HomeHeroBackdrop. */}
      <SinghaLivingBackground />
      <div className="relative z-[1]">
        {/* Hero — cinematic, editorial, restrained. Transparent so the fixed living scene
            shows behind the copy. */}
        <section className="relative overflow-hidden border-b border-white/[0.07]">
          {/* Sparse atmospheric depth — a single soft radial, not a red grid. The
              production (v3-off) hero base; when the living scene is on it sits faintly
              behind the copy. */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(80% 60% at 78% 8%, rgba(31,160,85,0.10), transparent 60%), radial-gradient(50% 50% at 8% 100%, rgba(201,162,75,0.07), transparent 65%)',
            }}
          />
          <div className="container-wide relative flex min-h-[85vh] flex-col justify-center py-20 sm:py-24 lg:min-h-[90vh]">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              {/* Left — editorial copy. A drop-shadow filter lifts every line of copy off the
                untinted hero image (the darkening scrim was removed). It must be drop-shadow, not
                text-shadow: text-shadow breaks the gradient-clipped headline ("assets & commodities",
                background-clip:text + transparent fill), whereas drop-shadow shadows the rendered
                gold pixels and leaves the fill intact — and it still shadows the plain copy below. */}
              <div
                style={{
                  filter:
                    'drop-shadow(0 1px 1px rgba(0,0,0,0.85)) drop-shadow(0 2px 12px rgba(0,0,0,0.6))',
                }}
              >
                <p className="eyebrow flex items-center gap-2">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-red-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  Offers · buy now · tenders · live auctions
                </p>
                <h1 className="mt-6 max-w-2xl font-serif text-5xl font-extrabold leading-[1.02] tracking-tight text-bone sm:text-6xl xl:text-7xl">
                  The trusted exchange for{' '}
                  <span className="bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent">
                    assets &amp; commodities
                  </span>
                  .
                </h1>
                <p className="mt-7 max-w-xl text-lg leading-relaxed text-bone-300/90">
                  Vehicles, machinery, gems, property, produce and commodities — discovered,
                  inspected and transacted through offers, buy now, tenders and auctions.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link href="/catalogue">
                    <Button variant="primary">Explore catalogue</Button>
                  </Link>
                  <Link href="/live">
                    <Button variant="outline">Watch live</Button>
                  </Link>
                </div>
                {/* Intent-first search + actions (CX doc 04) — controlled preview (neutralIaV1). */}
                <HomeSearchIntent />
                <div className="mt-10 h-px w-full max-w-md rule-fade" />
                <p className="mt-5 text-sm text-bone-500">
                  Clear terms · Verified sellers · Every bid on the record
                </p>
              </div>
              {/* Right — auto-scrolling 3D reel: featured lots mixed with Market Pulse news */}
              <HeroShowcase items={featured} news={pulseNews} />
            </div>
          </div>
        </section>

        {/* Below the hero: an opaque sheet (#070709 = the app base colour) that scrolls up
            and over the fixed living scene, so every section below reads solid exactly as
            before while the hero reveals the cinematic environment. */}
        <div className="relative bg-[#070709]">
          {/* §23 — signed-in attention rail. Renders nothing for signed-out or all-quiet viewers,
              so the homepage stays editorial + lightweight (rule 13). */}
          <HomeAttentionRail />

          {/* Featured items — real media, sale-aware cards. First full peak after the hero
              (CX10: varied py-16/20/24 rhythm instead of identical py-20 blocks, per the CX
              audit's "reads as a homogeneous scroll" finding). */}
          <section className="container-wide py-24">
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
                <span
                  aria-hidden
                  className="inline-block transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
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
          <section className="container-wide pb-20">
            <Card className="relative overflow-hidden p-8 sm:p-12">
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Chip tone="live">Singha Live</Chip>
                  <h2 className="mt-4 font-serif text-3xl font-bold text-bone">
                    Featured live auction
                  </h2>
                  <p className="mt-3 max-w-lg leading-relaxed text-bone-400">
                    Multi-camera broadcast where online, floor and phone bids all land together —
                    one live price everyone can trust, wherever you’re bidding from.
                  </p>
                </div>
                <Link href="/live">
                  <Button variant="primary">Enter live room</Button>
                </Link>
              </div>
            </Card>
          </section>

          {/* Explore categories — connective wayfinding, tightened a notch (CX10 rhythm pass). */}
          <section className="border-y border-white/[0.07] bg-coal-950/40">
            <div className="container-wide py-16">
              <p className="eyebrow">Browse by type</p>
              <h2 className="mb-9 mt-2 font-serif text-3xl font-bold tracking-tight text-bone sm:text-4xl">
                Explore categories
              </h2>
              <CategoryCards />
            </div>
          </section>

          {/* Ways to transact + Wanted (two-sided) — CX doc 04, controlled preview */}
          <HomeWaysToTransact />
          <HomeWanted />

          {/* Market Pulse */}
          <section className="container-wide py-20">
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
                  Market Pulse publishes only source-backed, reviewed content (pack doc 13). Sample
                  copy shown until live results are available.
                </p>
              </>
            )}
          </section>

          {/* §23 — local opportunities: a lightweight, config-driven editorial strip into the
              catalogue's real location filter (never a full catalogue on the home, rule 13). */}
          <HomeLocalOpportunities />

          {/* Trust & transparency — connective, tightened a notch (CX10 rhythm pass). */}
          <section className="border-t border-white/10 bg-coal-950/40">
            <div className="container-wide py-16">
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

          {/* Sell with Singha — the page's closing bookend. An editorial fade rule (already
              used once in the hero) reads as a deliberate final chapter break instead of
              repeating the same hairline border-t as every section above (doc 06 "fewer
              borders, prefer tint/spacing"); the extra padding + matching heading scale give
              it equal weight to the opening "Featured items" peak (CX10 rhythm pass). */}
          <section>
            <div className="container-wide">
              <div className="rule-fade h-px w-full" aria-hidden />
              <div className="flex flex-col items-start gap-6 py-24 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-bone sm:text-4xl">
                    Sell with Singha
                  </h2>
                  <p className="mt-3 max-w-lg leading-relaxed text-bone-400">
                    Banks, corporates, government and private sellers — disposal with an
                    institutional evidence trail from listing to settlement.
                  </p>
                </div>
                <Link href="/sell">
                  <Button variant="gold">Start selling</Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
