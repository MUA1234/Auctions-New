import { Card } from '@singha/ui';

export const metadata = {
  title: 'Terms · Singha Auctions',
  description: 'Terms of use for the Singha Auctions platform.',
};

/**
 * Placeholder-but-truthful Terms page (pack 01 doc 10 — no production primary-nav
 * link may 404). The binding legal wording is a business/compliance deliverable
 * (CLAUDE.md escalation list); this page states that honestly instead of
 * presenting unreviewed text as final terms.
 */
export default function TermsPage() {
  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Terms of use</h1>
      <Card className="mt-6 max-w-2xl">
        <p className="text-sm text-bone-300">
          The full terms and conditions for participating in Singha Auctions — bidder obligations,
          buyer&apos;s premium, payment and settlement, collection and dispute handling — are being
          finalised with our legal team and will be published here before public launch.
        </p>
        <p className="mt-4 text-sm text-bone-300">
          Until then, every sale is governed by the written terms provided with each auction event.
          For questions, please contact Singha Auctions directly.
        </p>
      </Card>
      <p className="mt-6 text-xs text-bone-500">
        This notice is a placeholder and is not the final, binding terms of use.
      </p>
    </div>
  );
}
