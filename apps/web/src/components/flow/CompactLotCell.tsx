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
        mark: 'Bid',
      };
    case 'buy_now':
      return { price: formatMoney(c.priceMinor, c.currency), time: null, mark: 'Buy' };
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
 * Purpose-built compact lot cell for the V3 Flow canvas (pack docs 08/10). Shows a
 * dominant image + only the essentials — price, time remaining, a tiny sale-method
 * marker and a watched indicator — with legible (not hairline) typography and a gentle
 * hover lift. NO binding bid button in a mini-cell: the whole cell is one tap target
 * that opens the rich lot detail where a binding action has proper size and context.
 * Reduced-motion safe (the lift/scale collapse under prefers-reduced-motion).
 */
export function CompactLotCell({ lot }: { lot: CatalogueCardV2 }) {
  const { price, time, mark } = compact(lot.commercial);
  return (
    <Link
      href={`/lot/${lot.id}`}
      className="group relative block overflow-hidden rounded-xl bg-coal-800 ring-1 ring-white/[0.06] transition-[transform,box-shadow,ring-color] duration-200 hover:-translate-y-0.5 hover:shadow-card hover:ring-gold-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
      aria-label={`${lot.title} — ${mark} ${price}${time ? `, ${time} left` : ''}`}
    >
      <div className="relative aspect-square">
        <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-square" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-coal-950/95 via-coal-950/45 to-transparent" />
        {/* Top row: time remaining (left) · watched (right) */}
        <div className="absolute inset-x-1 top-1 flex items-start justify-between gap-1">
          {time ? (
            <span className="tabular rounded-md bg-coal-950/75 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-bone-100 backdrop-blur-sm">
              {time}
            </span>
          ) : (
            <span />
          )}
          {lot.watchers > 0 && (
            <span className="rounded-md bg-coal-950/75 px-1.5 py-0.5 text-[10px] font-medium leading-none text-bone-200 backdrop-blur-sm">
              ♥ {lot.watchers}
            </span>
          )}
        </div>
      </div>
      {/* Bottom: title + price/sale-method — the essential state, legibly sized. */}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="line-clamp-1 text-[11px] font-medium leading-tight text-bone-100 group-hover:text-white">
          {lot.title}
        </p>
        <div className="mt-0.5 flex items-baseline justify-between gap-1">
          <span className="tabular text-xs font-bold leading-tight text-gold-400">{price}</span>
          {mark && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-bone-500">
              {mark}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
