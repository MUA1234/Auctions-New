import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { EvolutionEntryLinks } from '../../components/evolution/EvolutionEntryLinks';

export const metadata: Metadata = {
  title: 'Singha Exchange — ways to trade assets & commodities',
  description:
    'Singha Exchange is the commercial marketplace behind Singha: offers, buy now, tenders, auctions, procurement and recurring supply for valuable assets and commodities.',
};

/**
 * Singha Exchange overview (Evolution E1, pack docs 04/11). Editorial page — it explains the
 * ways to transact and routes into the real surfaces; it exposes no unbuilt functionality.
 * "Auction" appears here as one method among several, not the framing for everything.
 */

const METHODS: { name: string; blurb: string; tag: string }[] = [
  {
    name: 'Make Offer',
    tag: 'Negotiate',
    blurb: 'Propose your price and terms. The seller can accept, counter or decline — privately.',
  },
  {
    name: 'Buy Now',
    tag: 'Immediate',
    blurb: 'A fixed price for a clean, immediate purchase where the seller wants certainty.',
  },
  {
    name: 'Tenders & sealed offers',
    tag: 'Confidential',
    blurb: 'Submit a confidential proposal. Nobody sees competing prices before the window closes.',
  },
  {
    name: 'Timed & live auctions',
    tag: 'Competitive',
    blurb:
      'Open competitive bidding on a clock — the auction engine is the single source of truth.',
  },
  {
    name: 'Wanted & RFQ',
    tag: 'Sourcing',
    blurb: 'Post what you need and let verified suppliers come to you with commercial proposals.',
  },
  {
    name: 'Recurring supply',
    tag: 'Programmes',
    blurb: 'Standing availability of commodities and stock, sold by the unit, lot or container.',
  },
];

export default function ExchangePage() {
  return (
    <div className="container-wide py-16 sm:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow">Singha Exchange</p>
        <h1 className="mt-4 font-serif text-4xl font-extrabold tracking-tight text-bone sm:text-5xl">
          One exchange, many ways to{' '}
          <span className="bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent">
            do business
          </span>
          .
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-bone-300/90">
          Singha Exchange is the commercial marketplace behind Singha — where valuable assets and
          commodities are offered, bought, tendered, auctioned and sourced. Buyers and sellers meet
          on one set of records, with the right sale method for each deal.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/catalogue">
            <Button variant="primary">Explore inventory</Button>
          </Link>
          <Link href="/sell">
            <Button variant="outline">Sell with Singha</Button>
          </Link>
        </div>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {METHODS.map((m) => (
          <Card key={m.name} className="flex flex-col gap-3 p-6">
            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">
              {m.tag}
            </span>
            <h2 className="font-display text-lg font-semibold text-bone">{m.name}</h2>
            <p className="text-sm leading-relaxed text-bone-400">{m.blurb}</p>
          </Card>
        ))}
      </div>

      <EvolutionEntryLinks
        eyebrow="Open now"
        intro="These commercial surfaces are live for your account. Auctions, offers and buy-now open from each listing in the catalogue."
        links={[
          {
            href: '/wanted/procurement',
            label: 'Post an RFQ',
            flag: 'procurement',
            variant: 'primary',
          },
          { href: '/sell/supply', label: 'List recurring supply', flag: 'supplyProgrammes' },
          { href: '/wanted/supply', label: 'Find recurring supply', flag: 'supplyProgrammes' },
          { href: '/services/logistics', label: 'Logistics & freight', flag: 'logistics' },
        ]}
      />

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-bone-500">
        Sale methods are enabled progressively and vary by location, category and operator. Where a
        method is not yet available for a listing, it is clearly marked in-product rather than shown
        as complete.
      </p>
    </div>
  );
}
