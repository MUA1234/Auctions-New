import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { EvolutionEntryLinks } from '../../components/evolution/EvolutionEntryLinks';

export const metadata: Metadata = {
  title: 'Wanted — post what you need, suppliers respond',
  description:
    'The demand side of Singha Exchange: post requirements and let verified suppliers respond with commercial proposals — RFQ, request supply and reverse tenders for assets and commodities.',
};

/**
 * "Wanted" — the two-sided market's landing page (Evolution E1, pack docs 22/09; CX6 pack docs
 * 04/05). Editorial: it explains buyer-initiated sourcing AND supplier-initiated standing supply
 * side by side, then routes into the real surfaces (`/wanted/procurement`, `/wanted/supply`,
 * `/sell/supply`) — never exposing a form or a "browse" list that doesn't actually work (there is
 * no public "browse open requests" endpoint today; a supplier reaches a specific request via a
 * link shared by the buyer, which is what the supplier card below says honestly).
 */

const BUYER_MODES: { name: string; blurb: string; tag: string }[] = [
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

      {/* Two sides, side by side: buyers post a need; suppliers offer standing supply. */}
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">
            For buyers
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold text-bone">Post what you need</h2>
          <p className="mt-2 text-sm leading-relaxed text-bone-400">
            State your requirement in plain terms — item, quantity, destination, timing, budget.
            Singha turns it into a structured request; verified suppliers respond with priced,
            comparable proposals, and you track them all from one place and choose the winner
            yourself.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-bone-500">
            <li>· Post a request — RFQ, recurring supply, or a competitive reverse tender.</li>
            <li>· Track every request you've posted and its supplier responses in one list.</li>
            <li>· Compare proposals side by side and award explicitly — nothing is automatic.</li>
          </ul>
        </Card>
        <Card className="p-6 sm:p-7">
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">
            For suppliers
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold text-bone">
            Offer what you can supply
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-bone-400">
            Selling the same commodity or stock again and again? Publish it once as a standing
            supply programme — cadence, order sizes, indicative pricing and lead time — instead of
            re-listing every time. Buyers searching the market are matched to your active
            programmes.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-bone-500">
            <li>· Publish a recurring or on-demand supply programme in a few minutes.</li>
            <li>· Perishable goods: record shelf life, cold chain and harvest/expiry clearly.</li>
            <li>
              · Received a request link from a buyer? Open it directly to submit a priced proposal.
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {BUYER_MODES.map((m) => (
          <Card key={m.name} className="flex flex-col gap-3 p-6">
            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">
              {m.tag}
            </span>
            <h2 className="font-display text-base font-semibold text-bone">{m.name}</h2>
            <p className="text-sm leading-relaxed text-bone-400">{m.blurb}</p>
          </Card>
        ))}
      </div>

      <EvolutionEntryLinks
        eyebrow="Start sourcing"
        intro="Post a structured requirement and compare priced supplier proposals side by side, or match against standing supply programmes — you always choose the winner; nothing is awarded automatically."
        links={[
          {
            href: '/wanted/procurement',
            label: 'Post what you need',
            flag: 'procurement',
            variant: 'primary',
          },
          { href: '/wanted/supply', label: 'Find recurring supply', flag: 'supplyProgrammes' },
          {
            href: '/sell/supply',
            label: 'Offer your supply',
            flag: 'supplyProgrammes',
            variant: 'outline',
          },
        ]}
      />

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-bone-500">
        Buyer-side sourcing is rolling out progressively. If you’d like to post a requirement or
        respond as a supplier, get in touch through your Singha account and our team will help you
        take part.
      </p>
    </div>
  );
}
