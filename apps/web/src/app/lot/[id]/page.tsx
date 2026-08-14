import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chip } from '@singha/ui';
import { fetchLotDetail, type LotDetail } from '../../../lib/api';
import { BidPanel } from '../../../components/BidPanel';
import { BidBattle } from '../../../components/BidBattle';
import { SalePanel } from '../../../components/SalePanel';
import { WatchButton } from '../../../components/WatchButton';
import { LotGallery } from '../../../components/LotGallery';

export const dynamic = 'force-dynamic';

const SALE_METHOD_LABEL: Record<string, string> = {
  TIMED_AUCTION: 'Timed auction',
  BUY_NOW: 'Buy now',
  MAKE_OFFER: 'Make an offer',
  SEALED_TENDER: 'Sealed tender',
  EOI: 'Expression of interest',
};

export default async function LotPage({ params }: { params: { id: string } }) {
  let lot: LotDetail;
  try {
    lot = await fetchLotDetail(params.id);
  } catch {
    notFound();
  }

  const attrs = lot.attributes ?? {};
  const place = [lot.location?.city, lot.location?.region].filter(Boolean).join(', ');
  const method = SALE_METHOD_LABEL[lot.saleMethod] ?? lot.saleMethod.replace(/_/g, ' ');
  const priceMinor = lot.auction?.currentBidMinor ?? lot.currentBidMinor;

  return (
    <div className="container-page py-12">
      <Link href="/catalogue" className="text-sm text-bone-400 hover:text-bone">
        ← Back to catalogue
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: media + narrative */}
        <div>
          <LotGallery media={lot.media ?? []} title={lot.title} />

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Chip>{method}</Chip>
            <StatusChip status={lot.status} />
            <span className="text-xs text-bone-500">{lot.reference}</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-bone">
            {lot.title}
          </h1>
          <p className="mt-1 capitalize text-bone-500">
            {lot.category}
            {place ? ` · ${place}` : ''}
          </p>

          {/* Key facts — always populated so the page never reads as empty. */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 sm:grid-cols-4">
            <Fact label="Reference" value={lot.reference} />
            <Fact label="Category" value={lot.category} className="capitalize" />
            <Fact label="Location" value={place || '—'} />
            <Fact label="Sale method" value={method} />
          </dl>

          {(lot.fullDescription || lot.shortDescription) && (
            <div className="mt-7">
              <h2 className="font-display text-sm font-semibold text-bone">Description</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-bone-300">
                {lot.fullDescription || lot.shortDescription}
              </p>
            </div>
          )}

          {Object.keys(attrs).length > 0 && (
            <div className="mt-7">
              <h2 className="font-display text-sm font-semibold text-bone">Specifications</h2>
              <dl className="mt-3 grid gap-x-10 sm:grid-cols-2">
                {Object.entries(attrs).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b border-white/[0.06] py-2.5 text-sm"
                  >
                    <dt className="capitalize text-bone-500">{k.replace(/([A-Z])/g, ' $1')}</dt>
                    <dd className="text-right text-bone-200">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Right: bid engine or a proper sale summary — sticky on desktop. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {lot.auction ? (
            <>
              <BidPanel auctionId={lot.auction.id} initial={lot.auction} lotId={lot.id} />
              {/* Live rivalry context, gated on bidBattleV3 (renders nothing when OFF). */}
              <BidBattle auctionId={lot.auction.id} currency={lot.auction.currency} />
            </>
          ) : (
            <SalePanel
              listingId={lot.id}
              saleMethod={lot.saleMethod}
              currency={lot.currency}
              priceMinor={priceMinor ?? null}
            />
          )}

          <div className="mt-4">
            <WatchButton lotId={lot.id} />
          </div>

          <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-bone-200">
              <span className="text-gold-400" aria-hidden>
                ◆
              </span>
              Server-authoritative
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-bone-500">
              Every bid, payment and settlement is validated and recorded on an append-only ledger.
              The screen is never the record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-bone-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-bone-200 ${className}`}>{value}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === 'live' || s === 'open' || s === 'active' ? 'win' : s === 'sold' ? 'neutral' : 'gold';
  return <Chip tone={tone}>{status.replace(/_/g, ' ')}</Chip>;
}
