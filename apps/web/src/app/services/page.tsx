import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';

export const metadata: Metadata = {
  title: 'Services — inspection, logistics, export & settlement',
  description:
    'The services around every Singha transaction: inspection and verification, logistics and freight, secure shipping, export documentation, and payments and settlement.',
};

/**
 * "Services" — everything around the transaction (Evolution E1, pack docs 16/28). Editorial
 * overview that routes into real surfaces; specific provider-backed services are enabled per
 * operator and market as credentials/config are confirmed, which this page states honestly.
 */

const SERVICES: { name: string; blurb: string }[] = [
  {
    name: 'Inspection & verification',
    blurb: 'Documented condition, ownership and specification checks before you commit to a deal.',
  },
  {
    name: 'Logistics & freight',
    blurb:
      'Pickup, inland transport, container, RoRo, reefer and breakbulk — matched to the goods.',
  },
  {
    name: 'Secure & insured shipping',
    blurb: 'Insured couriers for gems and high-value items; tracked handling end to end.',
  },
  {
    name: 'Export & documentation',
    blurb:
      'Origin, port and trade-term paperwork for cross-border movement, handled with the sale.',
  },
  {
    name: 'Payments & settlement',
    blurb:
      'One experience, regulated settlement routes, with fees and taxes itemised transparently.',
  },
  {
    name: 'Storage & custody',
    blurb:
      'Secure holding and custody where an asset needs safekeeping between sale and collection.',
  },
];

export default function ServicesPage() {
  return (
    <div className="container-wide py-16 sm:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow">Services</p>
        <h1 className="mt-4 font-serif text-4xl font-extrabold tracking-tight text-bone sm:text-5xl">
          Everything around the{' '}
          <span className="bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent">
            transaction
          </span>
          .
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-bone-300/90">
          Finding the deal is only part of it. Singha coordinates inspection, logistics, secure
          shipping, export documentation and settlement — so an asset can move from listing to
          delivery, across markets, on one auditable record.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/catalogue">
            <Button variant="primary">Explore inventory</Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="outline">How it works</Button>
          </Link>
        </div>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <Card key={s.name} className="flex flex-col gap-3 p-6">
            <h2 className="font-display text-lg font-semibold text-bone">{s.name}</h2>
            <p className="text-sm leading-relaxed text-bone-400">{s.blurb}</p>
          </Card>
        ))}
      </div>

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-bone-500">
        Services are provided by Singha and its local operators, and are enabled per market and
        category as arrangements are confirmed. Availability is shown against each listing rather
        than promised in the abstract.
      </p>
    </div>
  );
}
