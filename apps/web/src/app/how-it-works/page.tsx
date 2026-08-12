import Link from 'next/link';
import { Card } from '@singha/ui';

export const metadata = {
  title: 'How it works · Singha Auctions',
  description: 'How buying and selling works on Singha Auctions.',
};

/**
 * Lightweight, truthful "how it works" page (pack 01 doc 10 — no production
 * primary-nav link may 404). Describes only capabilities that exist today; it
 * does not imply features that are still mock/credential-gated.
 */
export default function HowItWorksPage() {
  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">How Singha Auctions works</h1>
      <p className="mt-2 max-w-2xl text-bone-400">
        Singha is a timed-auction and asset-exchange platform. The auction engine is the single
        source of truth for every bid, extension and result.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="font-serif text-xl font-semibold text-bone">For buyers</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-bone-300">
            <li>Browse the catalogue in Flow, Grid or List.</li>
            <li>Watch lots and follow them from your command centre.</li>
            <li>
              Place bids on timed auctions — proxy bidding and soft-close protect you against
              last-second sniping.
            </li>
            <li>Win, settle payment, then arrange pickup or delivery.</li>
          </ol>
          <Link href="/catalogue" className="mt-4 inline-block text-sm text-red-400">
            Browse the catalogue →
          </Link>
        </Card>

        <Card>
          <h2 className="font-serif text-xl font-semibold text-bone">For sellers</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-bone-300">
            <li>List an asset with photos, documents and condition details.</li>
            <li>Choose a sale method: timed auction, EOI, Buy Now, offer or sealed tender.</li>
            <li>Our team reviews and publishes the listing.</li>
            <li>Track interest and results from your seller dashboard.</li>
          </ol>
          <Link href="/sell" className="mt-4 inline-block text-sm text-red-400">
            Start selling →
          </Link>
        </Card>
      </div>

      <p className="mt-8 text-xs text-bone-500">
        Sale methods and channels are enabled progressively. Where a feature is not yet live it is
        clearly marked in-product rather than shown as complete.
      </p>
    </div>
  );
}
