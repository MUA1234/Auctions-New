'use client';

import Link from 'next/link';
import { Chip } from '@singha/ui';
import type { CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

/**
 * Sale-aware catalogue card (Revision 05 §6). Premium rounded glass surface with
 * an elegant media frame, a clear sale-method chip and a strong price hierarchy;
 * gentle hover lift. It renders a DIFFERENT commercial line per sale method from
 * the discriminated `commercial` payload — an EOI card never shows a bid, a Buy
 * Now shows a fixed price, etc. `compact` is the denser Flow-card variant.
 */
export function SaleCard({ lot, compact = false }: { lot: CatalogueCardV2; compact?: boolean }) {
  return (
    <Link href={`/lot/${lot.id}`} className="group block h-full">
      <article className={`card-premium flex h-full flex-col ${compact ? 'p-2.5' : 'p-3'}`}>
        <div className="relative overflow-hidden rounded-xl">
          <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-[4/3]" />
          {/* Bottom scrim so the chip/price legibly float over any image. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coal-950/85 via-coal-950/20 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
            <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
            <div className="flex items-center gap-2 text-[11px] font-medium text-bone-200">
              {lot.featured && <span className="text-gold-300">★</span>}
              {lot.watchers > 0 && <span className="text-bone-300">♥ {lot.watchers}</span>}
            </div>
          </div>
          {lot.media.videoAvailable && (
            <span className="absolute bottom-2 right-2 rounded bg-coal-950/80 px-1.5 py-0.5 text-[10px] text-bone-200 backdrop-blur">
              ▶ Video
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-1 flex-col">
          <h3
            className={`font-display font-semibold leading-snug text-bone transition-colors group-hover:text-white ${
              compact ? 'line-clamp-1 text-sm' : 'line-clamp-2 text-base'
            }`}
          >
            {lot.title}
          </h3>
          {!compact && lot.shortDescription && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-bone-500">
              {lot.shortDescription}
            </p>
          )}
          <p className="mt-1 text-xs capitalize text-bone-500">
            {lot.category}
            {lot.location?.city ? ` · ${lot.location.city}` : ''}
          </p>
          <div className="mt-3 border-t border-white/[0.06] pt-2.5">
            <Commercial lot={lot} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function Commercial({ lot }: { lot: CatalogueCardV2 }) {
  const c = lot.commercial;
  switch (c.kind) {
    case 'auction':
      return (
        <Line
          label="Current bid"
          value={formatMoney(c.currentBidMinor, c.currency)}
          meta={c.endsAt ? `Ends in ${timeLeft(c.endsAt)}` : ''}
        />
      );
    case 'eoi':
      return (
        <Line
          label={c.guidePriceMinor ? 'Guide' : 'Expressions of interest'}
          value={c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Open'}
          meta={`${c.interestCount} interested${c.closesAt ? ` · closes ${timeLeft(c.closesAt)}` : ''}`}
        />
      );
    case 'buy_now':
      return (
        <Line
          label="Buy now"
          value={formatMoney(c.priceMinor, c.currency)}
          meta="Immediate purchase"
        />
      );
    case 'make_offer':
      return (
        <Line
          label={c.guidePriceMinor ? 'Guide' : 'Make an offer'}
          value={c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Open'}
          meta={`${c.offerCount} offers`}
        />
      );
    case 'sealed_tender':
      return (
        <Line
          label={c.guidePriceMinor ? 'Guide' : 'Sealed tender'}
          value={c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Submit sealed'}
          meta={`${c.submissionCount} submissions${c.closesAt ? ` · closes ${timeLeft(c.closesAt)}` : ''}`}
        />
      );
    default:
      return <Line label="" value="View lot" meta="" />;
  }
}

function Line({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        {label && <p className="text-[11px] uppercase tracking-wide text-bone-500">{label}</p>}
        <span className="tabular font-display text-lg font-bold text-gold-400">{value}</span>
      </div>
      {meta && <span className="text-right text-xs text-bone-400">{meta}</span>}
    </div>
  );
}
