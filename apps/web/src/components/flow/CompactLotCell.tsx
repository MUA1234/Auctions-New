'use client';

import Link from 'next/link';
import type { CatalogueCardV2 } from '../../lib/api';
import { coverUrl } from '../../lib/media';
import { formatMoney, timeLeft } from '../../lib/format';
import { LotImage } from '../LotImage';

/** The compact figure + optional timer a Flow cell shows for each sale method. */
function compact(c: CatalogueCardV2['commercial']): {
  price: string;
  time: string | null;
  mark: string;
} {
  switch (c.kind) {
    case 'auction':
      return {
        price: formatMoney(c.currentBidMinor, c.currency),
        time: c.endsAt ? timeLeft(c.endsAt) : null,
        mark: 'Auction',
      };
    case 'buy_now':
      return { price: formatMoney(c.priceMinor, c.currency), time: null, mark: 'Buy now' };
    case 'eoi':
      return {
        price: c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'EOI',
        time: c.closesAt ? timeLeft(c.closesAt) : null,
        mark: 'EOI',
      };
    case 'make_offer':
      return {
        price: c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Offer',
        time: null,
        mark: 'Offer',
      };
    case 'sealed_tender':
      return {
        price: c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Tender',
        time: c.closesAt ? timeLeft(c.closesAt) : null,
        mark: 'Tender',
      };
    default:
      return { price: 'View', time: null, mark: '' };
  }
}

/**
 * Purpose-built compact lot cell for the V3 Flow canvas (pack docs 08/10). Shows
 * dominant image + essential state (price + time/sale marker) only — NO binding
 * bid button in a mini-cell. The whole cell is a single tap target that opens the
 * rich lot detail where a binding action has proper size and context.
 */
export function CompactLotCell({ lot }: { lot: CatalogueCardV2 }) {
  const { price, time, mark } = compact(lot.commercial);
  return (
    <Link
      href={`/lot/${lot.id}`}
      className="group relative block overflow-hidden rounded-lg bg-coal-800 ring-1 ring-white/[0.06] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 active:scale-[0.98]"
      aria-label={`${lot.title} — ${mark} ${price}${time ? `, ${time} left` : ''}`}
    >
      <div className="relative aspect-square">
        <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-square" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-coal-950/90 via-coal-950/30 to-transparent" />
        {time && (
          <span className="absolute left-1 top-1 rounded bg-coal-950/70 px-1 py-0.5 text-[9px] font-semibold tabular text-bone-100 backdrop-blur-sm">
            {time}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-1.5">
        <p className="truncate text-[10px] font-medium leading-tight text-bone-200 group-hover:text-white">
          {lot.title}
        </p>
        <p className="tabular text-[11px] font-bold leading-tight text-gold-400">{price}</p>
      </div>
    </Link>
  );
}
