import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chip } from '@singha/ui';
import { fetchLotDetail, type LotDetail } from '../../../lib/api';
import { mediaUrl } from '../../../lib/media';
import { humanize } from '../../../lib/format';
import { BidPanel } from '../../../components/BidPanel';
import { BidBattle } from '../../../components/BidBattle';
import { SalePanel } from '../../../components/SalePanel';
import { WatchButton } from '../../../components/WatchButton';
import { LotGallery } from '../../../components/LotGallery';
import { LotStickyDock } from '../../../components/LotStickyDock';
import { LotLogisticsHint } from '../../../components/LotLogisticsHint';
import { StatusChip } from '../../../components/StatusChip';
import { AskSinghaButton } from '../../../components/assistant/AskSinghaButton';

export const dynamic = 'force-dynamic';

const SALE_METHOD_LABEL: Record<string, string> = {
  TIMED_AUCTION: 'Timed auction',
  BUY_NOW: 'Buy now',
  MAKE_OFFER: 'Make an offer',
  SEALED_TENDER: 'Sealed tender',
  EXPRESSION_OF_INTEREST: 'Expression of interest',
  LIVE_HYBRID: 'Live auction',
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
  const method = SALE_METHOD_LABEL[lot.saleMethod] ?? humanize(lot.saleMethod);
  const priceMinor = lot.auction?.currentBidMinor ?? lot.currentBidMinor;
  // Supporting documents (contracts, certificates, reports) are just another `media` kind
  // (`packages/contracts/src/commands.ts` `mediaKindValues`) — the gallery already keeps
  // non-video kinds for its image strip, so documents are pulled out separately here rather
  // than left to render as a broken image thumbnail.
  const documents = (lot.media ?? []).filter((m) => m.kind === 'document');

  return (
    <div className="container-page pb-28 pt-12 lg:pb-12">
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
            {/* §19 — customer-safe verified-seller trust chip (identity-verified seller). */}
            {lot.seller?.verified && (
              <Chip tone="win" title="Identity-verified seller">
                ✓ Verified seller
              </Chip>
            )}
            <span className="text-xs text-bone-500">{lot.reference}</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-bone">
            {lot.title}
          </h1>
          <p className="mt-1 capitalize text-bone-500">
            {lot.category}
            {place ? ` · ${place}` : ''}
          </p>

          {/* Key facts — always populated so the page never reads as empty. Tinted, not
              bordered (doc 06 "fewer borders, larger media"). */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-white/[0.02] p-5 sm:grid-cols-4">
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

          {lot.inspectionSummary && (
            <div className="mt-7">
              <h2 className="font-display text-sm font-semibold text-bone">
                Viewing &amp; inspection
              </h2>
              <p className="mt-2 break-words leading-relaxed text-bone-300">
                {lot.inspectionSummary}
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
                    <dt className="text-bone-500">{humanize(k)}</dt>
                    <dd className="text-right text-bone-200">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {documents.length > 0 && (
            <div className="mt-7">
              <h2 className="font-display text-sm font-semibold text-bone">Documents</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {documents.map((doc, i) => {
                  const href = mediaUrl(doc.storageKey);
                  if (!href) return null;
                  return (
                    <li key={doc.id}>
                      <a
                        href={href}
                        className="inline-flex max-w-full items-center gap-1.5 break-words rounded text-sm text-bone-200 underline decoration-white/20 underline-offset-4 transition-colors hover:text-gold-300 hover:decoration-gold-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
                      >
                        {doc.caption || `Document ${i + 1}`}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right: bid engine or a proper sale summary — sticky on desktop. */}
        <div id="lot-action" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
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

          <div className="mt-4 flex flex-col gap-2.5">
            <WatchButton lotId={lot.id} />
            {/* Secondary to the primary transaction action above (Bid/Buy/Offer) — never
                competing with it. Renders nothing when aiConversation is off. */}
            <AskSinghaButton listingId={lot.id} url={`/lot/${lot.id}`} />
          </div>

          {/* CX8: compact collection/delivery affordance, woven right into the transaction
              rail. Renders nothing when there's no pickup line and Logistics is off. */}
          <LotLogisticsHint collectionSummary={lot.collectionSummary} place={place} />

          <div className="mt-5 rounded-xl bg-white/[0.02] p-4">
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

      {/* Mobile-only sticky action dock — key state + primary action always in reach. */}
      <LotStickyDock
        priceMinor={priceMinor ?? null}
        currency={lot.auction?.currency ?? lot.currency}
        saleMethod={lot.saleMethod}
      />
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
