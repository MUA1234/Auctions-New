import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Chip } from '@singha/ui';
import { fetchLotDetail, type LotDetail } from '../../../lib/api';
import { BidPanel } from '../../../components/BidPanel';
import { WatchButton } from '../../../components/WatchButton';
import { LotGallery } from '../../../components/LotGallery';

export const dynamic = 'force-dynamic';

export default async function LotPage({ params }: { params: { id: string } }) {
  let lot: LotDetail;
  try {
    lot = await fetchLotDetail(params.id);
  } catch {
    notFound();
  }

  const attrs = lot.attributes ?? {};
  const place = [lot.location?.city, lot.location?.region].filter(Boolean).join(', ');

  return (
    <div className="container-page py-12">
      <Link href="/catalogue" className="text-sm text-bone-400 hover:text-bone">
        ← Back to catalogue
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <LotGallery media={lot.media ?? []} title={lot.title} />
          <div className="mt-6 flex items-center gap-3">
            <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
            <span className="text-xs text-bone-500">{lot.reference}</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold text-bone">{lot.title}</h1>
          <p className="mt-1 capitalize text-bone-500">
            {lot.category}
            {place ? ` · ${place}` : ''}
          </p>

          {lot.fullDescription && (
            <p className="mt-4 whitespace-pre-line text-bone-300">{lot.fullDescription}</p>
          )}
          {!lot.fullDescription && lot.shortDescription && (
            <p className="mt-4 text-bone-300">{lot.shortDescription}</p>
          )}

          {Object.keys(attrs).length > 0 && (
            <Card className="mt-6">
              <h2 className="font-display text-sm font-semibold text-bone">Details</h2>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                {Object.entries(attrs).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="capitalize text-bone-500">{k.replace(/([A-Z])/g, ' $1')}</dt>
                    <dd className="text-bone-200">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>

        <div>
          {lot.auction ? (
            <BidPanel auctionId={lot.auction.id} initial={lot.auction} />
          ) : (
            <Card>
              <p className="text-bone-400">This lot is not open for bidding.</p>
            </Card>
          )}
          <div className="mt-4">
            <WatchButton lotId={lot.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
