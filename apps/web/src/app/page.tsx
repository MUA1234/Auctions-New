import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { apiGet, type MarketPulse } from '../lib/api';
import { formatMoney } from '../lib/format';

export const dynamic = 'force-dynamic';

/**
 * Homepage — editorial and lightweight (docs/13): hero + featured items +
 * featured event + categories + Market Pulse + trust + seller CTA. NO full
 * catalogue here. All data below is PLACEHOLDER; Phase 4 wires the real featured
 * placements, editorial controls and live pricing.
 */

const FEATURED = [
  {
    ref: 'VH-2043',
    title: '2019 Toyota Land Cruiser Prado',
    location: 'Colombo',
    method: 'Timed',
    price: 'LKR 24,500,000',
    time: 'Closes in 2d 04h',
  },
  {
    ref: 'GM-0071',
    title: 'Ceylon Blue Sapphire, 4.2ct',
    location: 'Ratnapura',
    method: 'Sealed Tender',
    price: 'Guide LKR 3,800,000',
    time: 'Closes in 5d',
  },
  {
    ref: 'MC-1188',
    title: 'CAT 320D Hydraulic Excavator',
    location: 'Gampaha',
    method: 'EOI',
    price: 'Expressions open',
    time: 'Ongoing',
  },
  {
    ref: 'PR-0459',
    title: 'Commercial Land · 42 perches',
    location: 'Kandy',
    method: 'Make Offer',
    price: 'Guide LKR 96,000,000',
    time: 'Ongoing',
  },
];

const CATEGORIES = [
  'Vehicles',
  'Machinery & Equipment',
  'Gems & Jewellery',
  'Property',
  'Business Assets',
  'Stock & Bulk',
  'Agriculture',
  'General Assets',
];

const PULSE = [
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

export default async function HomePage() {
  let pulse: MarketPulse | null = null;
  try {
    pulse = await apiGet<MarketPulse>('/intelligence/market-pulse');
  } catch {
    pulse = null;
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="hud-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-red-glow-radial" aria-hidden />
        <div className="container-page relative py-24 sm:py-32">
          <Chip tone="live" className="animate-float-in">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Live &amp; timed auctions
          </Chip>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl font-extrabold leading-[1.05] tracking-tight text-bone sm:text-6xl">
            Sri Lanka’s trusted
            <span className="text-glow-red text-red-500"> asset exchange</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-bone-400">
            Vehicles, machinery, gems, property and business assets — discovered, inspected and won
            through transparent, real-time auctions.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/catalogue">
              <Button variant="primary">Explore catalogue</Button>
            </Link>
            <Link href="/live">
              <Button variant="outline">Watch live</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-bone-500">
            Institutional transparency · Verified sellers · Server-authoritative bidding
          </p>
        </div>
      </section>

      {/* Featured items */}
      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-bold text-bone">Featured items</h2>
          <Link href="/catalogue" className="text-sm font-medium text-gold-400 hover:text-gold-300">
            View all →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED.map((item) => (
            <Card key={item.ref} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Chip>{item.method}</Chip>
                <span className="text-xs text-bone-500">{item.ref}</span>
              </div>
              <div
                className="aspect-[4/3] w-full bg-gradient-to-br from-coal-700/60 to-coal-900/80 hud-cut-sm"
                aria-hidden
              />
              <div>
                <h3 className="font-display text-base font-semibold text-bone">{item.title}</h3>
                <p className="text-xs text-bone-500">{item.location}</p>
              </div>
              <div className="mt-auto flex items-end justify-between">
                <span className="tabular font-display text-lg font-bold text-gold-400">
                  {item.price}
                </span>
                <span className="text-xs text-bone-400">{item.time}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured event */}
      <section className="container-page pb-16">
        <Card className="relative overflow-hidden border-red-500/20 p-8 sm:p-10">
          <div className="absolute inset-0 bg-red-glow-radial opacity-70" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Chip tone="live">Singha Live</Chip>
              <h2 className="mt-3 font-serif text-3xl font-bold text-bone">
                Featured live auction
              </h2>
              <p className="mt-2 max-w-lg text-bone-400">
                Multi-camera broadcast with online, floor and phone bidding in one unified ledger.
              </p>
            </div>
            <Link href="/live">
              <Button variant="primary">Enter live room</Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Explore categories */}
      <section className="border-y border-white/10 bg-coal-950/40">
        <div className="container-page py-16">
          <h2 className="mb-8 font-serif text-2xl font-bold text-bone">Explore categories</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category}
                href="/catalogue"
                className="card group flex items-center justify-between p-4 transition-colors hover:border-red-500/30"
              >
                <span className="font-display text-sm font-semibold text-bone-200">{category}</span>
                <span className="text-gold-500 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Market Pulse */}
      <section className="container-page py-16">
        <div className="mb-8 flex items-center gap-3">
          <h2 className="font-serif text-2xl font-bold text-bone">Market Pulse</h2>
          <Chip tone="gold">Editorial</Chip>
        </div>
        {pulse && pulse.salesCount > 0 ? (
          <>
            <div className="grid gap-5 md:grid-cols-3">
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid gap-5 md:grid-cols-3">
              {PULSE.map((entry) => (
                <Card key={entry.tag} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold-400">
                    {entry.tag}
                  </span>
                  <p className="text-sm text-bone-300">{entry.text}</p>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-xs text-bone-600">
              Market Pulse publishes only source-backed, reviewed content (docs/12). Sample copy
              shown until live results are available.
            </p>
          </>
        )}
      </section>

      {/* Sell with Singha */}
      <section className="border-t border-white/10">
        <div className="container-page flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold text-bone">Sell with Singha</h2>
            <p className="mt-2 max-w-lg text-bone-400">
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
