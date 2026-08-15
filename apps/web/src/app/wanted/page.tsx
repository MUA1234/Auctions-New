import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';

export const metadata: Metadata = {
  title: 'Wanted — post what you need, suppliers respond',
  description:
    'The demand side of Singha Exchange: post requirements and let verified suppliers respond with commercial proposals — RFQ, request supply and reverse tenders for assets and commodities.',
};

/**
 * "Wanted" — the two-sided market's demand side (Evolution E1, pack docs 22/09). Editorial:
 * it explains buyer-initiated sourcing and routes to real surfaces. Procurement tooling is
 * built in a later phase, so this page states that honestly and exposes no unbuilt forms.
 */

const MODES: { name: string; blurb: string; tag: string }[] = [
  {
    name: 'Request for Quote (RFQ)',
    tag: 'Buyers',
    blurb: 'Describe the goods and terms you need; suppliers return priced, comparable proposals.',
  },
  {
    name: 'Request Supply',
    tag: 'Commodities',
    blurb: '“Wanted: 200 MT red onion, 50 MT/month to Colombo.” Suppliers offer against your spec.',
  },
  {
    name: 'Reverse tender',
    tag: 'Competitive',
    blurb: 'Suppliers compete to meet your requirement on the best overall commercial terms.',
  },
  {
    name: 'Procurement events',
    tag: 'Organisations',
    blurb:
      'Companies, government and large buyers run structured sourcing with a full audit trail.',
  },
];

export default function WantedPage() {
  return (
    <div className="container-wide py-16 sm:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow">Wanted</p>
        <h1 className="mt-4 font-serif text-4xl font-extrabold tracking-tight text-bone sm:text-5xl">
          Tell Singha what you’re{' '}
          <span className="bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent">
            looking for
          </span>
          .
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-bone-300/90">
          Singha is a two-sided market: as well as browsing what’s for sale, buyers can post what
          they need and let verified suppliers come to them with real commercial proposals — by the
          unit, lot or container, with delivery and payment terms attached.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/catalogue">
            <Button variant="primary">Explore inventory</Button>
          </Link>
          <Link href="/sell">
            <Button variant="outline">Supply to Singha</Button>
          </Link>
        </div>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((m) => (
          <Card key={m.name} className="flex flex-col gap-3 p-6">
            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">
              {m.tag}
            </span>
            <h2 className="font-display text-base font-semibold text-bone">{m.name}</h2>
            <p className="text-sm leading-relaxed text-bone-400">{m.blurb}</p>
          </Card>
        ))}
      </div>

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-bone-500">
        Buyer-side sourcing is rolling out progressively. If you’d like to post a requirement or
        respond as a supplier, get in touch through your Singha account and our team will help you
        take part.
      </p>
    </div>
  );
}
