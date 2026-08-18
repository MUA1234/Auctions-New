'use client';

import Link from 'next/link';
import type { CatalogueCardV2 } from '../../lib/api';
import { coverUrl } from '../../lib/media';
import { timeLeft } from '../../lib/format';
import { LotImage } from '../LotImage';

/** Amount in major units, no currency — grouped, no decimals (fits up to ~10 digits). */
function amountOf(minor: number | null | undefined): string {
  if (minor == null) return '—';
  return (minor / 100).toLocaleString('en-LK', { maximumFractionDigits: 0 });
}

/** The compact figure a Flow cell shows for each sale method: a priced amount (+currency)
 *  or a short label, plus optional time remaining and a tiny sale-method marker. */
function compact(c: CatalogueCardV2['commercial']): {
  amount: string;
  currency: string;
  time: string | null;
  mark: string;
} {
  switch (c.kind) {
    case 'auction':
      return {
        amount: amountOf(c.currentBidMinor),
        currency: c.currency,
        time: c.endsAt ? timeLeft(c.endsAt) : null,
        mark: 'Bid',
      };
    case 'buy_now':
      return { amount: amountOf(c.priceMinor), currency: c.currency, time: null, mark: 'Buy' };
    case 'eoi':
      return c.guidePriceMinor
        ? {
            amount: amountOf(c.guidePriceMinor),
            currency: c.currency,
            time: c.closesAt ? timeLeft(c.closesAt) : null,
            mark: 'EOI',
          }
        : {
            amount: 'EOI',
            currency: '',
            time: c.closesAt ? timeLeft(c.closesAt) : null,
            mark: 'EOI',
          };
    case 'make_offer':
      return c.guidePriceMinor
        ? { amount: amountOf(c.guidePriceMinor), currency: c.currency, time: null, mark: 'Offer' }
        : { amount: 'Offer', currency: '', time: null, mark: 'Offer' };
    case 'sealed_tender':
      return c.guidePriceMinor
        ? {
            amount: amountOf(c.guidePriceMinor),
            currency: c.currency,
            time: c.closesAt ? timeLeft(c.closesAt) : null,
            mark: 'Tender',
          }
        : {
            amount: 'Tender',
            currency: '',
            time: c.closesAt ? timeLeft(c.closesAt) : null,
            mark: 'Tender',
          };
    default:
      return { amount: 'View', currency: '', time: null, mark: '' };
  }
}

/**
 * Compact lot cell for the V3 Flow rails (pack docs 08/10). Image-dominant; only the
 * essentials: the lot identifier (make/model/year — never the category, which is the
 * band's job), a legible price with the currency set smaller than the amount and the
 * amount kept to a single non-wrapping line (fits ~10 digits), plus time remaining, a
 * tiny sale-method marker and a watched (♥) indicator. One tap target — never a bid
 * button in a mini-cell. Reduced-motion safe.
 */
export function CompactLotCell({ lot }: { lot: CatalogueCardV2 }) {
  const { amount, currency, time, mark } = compact(lot.commercial);
  return (
    <Link
      href={`/lot/${lot.id}`}
      className="group relative block overflow-hidden rounded-xl bg-coal-800 ring-1 ring-white/[0.06] transition-[transform,box-shadow,ring-color] duration-200 hover:-translate-y-0.5 hover:shadow-card hover:ring-gold-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
      aria-label={`${lot.title} — ${mark} ${currency} ${amount}${time ? `, ${time} left` : ''}`}
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
          <span className="flex items-center gap-1">
            {/* §19 — tiny customer-safe verified-seller marker (kept minimal for the mini-cell). */}
            {lot.seller?.verified && (
              <span
                title="Verified seller"
                aria-label="Verified seller"
                className="inline-flex items-center rounded-md bg-emerald-500/90 px-1 py-0.5 text-[9px] font-bold leading-none text-coal-950 backdrop-blur-sm"
              >
                ✓
              </span>
            )}
            {lot.watchers > 0 && (
              <span className="rounded-md bg-coal-950/75 px-1.5 py-0.5 text-[10px] font-medium leading-none text-bone-200 backdrop-blur-sm">
                ♥ {lot.watchers}
              </span>
            )}
          </span>
        </div>
        {/* Tiny sale-method marker sits on the image so the price line stays free. */}
        {mark && (
          <span className="absolute bottom-1 left-1 rounded bg-coal-950/70 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide leading-none text-bone-300 backdrop-blur-sm">
            {mark}
          </span>
        )}
      </div>
      {/* Below the image: identifier + price. */}
      <div className="p-1.5">
        <p className="line-clamp-1 text-[10px] font-medium leading-tight text-bone-100 group-hover:text-white">
          {lot.title}
        </p>
        <p className="mt-0.5 flex items-baseline gap-0.5 whitespace-nowrap leading-none">
          {currency && (
            <span className="text-[8px] font-semibold text-gold-400/70">{currency}</span>
          )}
          <span className="tabular text-[11px] font-bold text-gold-400">{amount}</span>
        </p>
      </div>
    </Link>
  );
}
