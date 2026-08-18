'use client';

import Link from 'next/link';
import type { CardCommercial, CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { categoryMeta, saleMethodIcon, saleMethodLabel } from '../lib/categories';
import { formatLocation, formatMoney, formatQuantity, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';
import { AskSinghaButton } from './assistant/AskSinghaButton';

/**
 * One clear, sale-method-appropriate call to action per commercial kind (CX3 "universal
 * card", pack doc 04). Never a raw enum, never more than one action on a card — this is
 * the only place that maps a `commercial.kind` to a customer-facing verb, so every card
 * reads consistently whether it's a vehicle, a sapphire, 40 MT of onions, scrap, an
 * excavator or land.
 */
function primaryActionLabel(kind: CardCommercial['kind']): string {
  switch (kind) {
    case 'auction':
      return 'Bid';
    case 'buy_now':
      return 'Buy now';
    case 'make_offer':
      return 'Make offer';
    case 'eoi':
      return 'Request quote';
    case 'sealed_tender':
      return 'Respond';
    default:
      return 'View';
  }
}

/**
 * Sale-aware, sale-method-NEUTRAL catalogue card (CX3 "universal card", pack doc 04
 * hierarchy: media → title → location → price/offer-state → quantity+unit → sale method
 * → availability/close → a subtle logistics hint → exactly one primary action). Premium
 * rounded glass surface with a clean, uncluttered media frame and a quiet metadata stack
 * below it — no field here assumes an auction; it renders a DIFFERENT commercial line per
 * sale method from the discriminated `commercial` payload, and quantity/logistics only
 * appear `when present` so a single vehicle and 40 MT of onions both look intentional.
 * `compact` is the denser Flow-rail variant and, like `CompactLotCell`, deliberately stays
 * a single tap target with no separate action button.
 */
export function SaleCard({ lot, compact = false }: { lot: CatalogueCardV2; compact?: boolean }) {
  const category = categoryMeta(lot.category);
  const SaleMethodIcon = saleMethodIcon(lot.saleMethod);
  const locationText = lot.location ? formatLocation(lot.location) : '';
  // §3 — humanised subcategory slug for a subtle "type" caption (e.g. suv_4x4 → "Suv 4x4").
  const subcatLabel = lot.subcategory
    ? lot.subcategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';
  const hasQuantity = lot.quantity != null && lot.quantity !== '';

  return (
    <Link
      href={`/lot/${lot.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
    >
      <article className={`card-premium flex h-full flex-col ${compact ? 'p-2.5' : 'p-3'}`}>
        <div className="relative overflow-hidden rounded-xl">
          <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-[4/3]" />
          {/* Bottom scrim so the watch/video markers stay legible over any photo. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coal-950/85 via-coal-950/20 to-transparent" />
          {(lot.featured || lot.watchers > 0 || lot.seller?.verified) && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2 text-[11px] font-medium text-bone-200">
              {/* §19 — customer-safe verified-seller trust marker (identity-verified seller). */}
              <span>
                {lot.seller?.verified && (
                  <span
                    title="Identity-verified seller"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-coal-950 backdrop-blur"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden
                      className="h-2.5 w-2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Verified
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {lot.featured && <span className="text-gold-300">★</span>}
                {lot.watchers > 0 && <span className="text-bone-300">♥ {lot.watchers}</span>}
              </span>
            </div>
          )}
          {lot.media.videoAvailable && (
            <span className="absolute bottom-2 right-2 rounded bg-coal-950/80 px-1.5 py-0.5 text-[10px] text-bone-200 backdrop-blur">
              ▶ Video
            </span>
          )}
          {/* Compact, unobtrusive — top-left, clear of the featured/watchers/video markers.
              Only on the full card: `compact` (Flow-rail) cards deliberately stay a single tap
              target with no separate action button (see the card's own doc comment above). */}
          {!compact && (
            <AskSinghaButton
              listingId={lot.id}
              url={`/lot/${lot.id}`}
              variant="compact"
              className="absolute left-2 top-2 z-10"
            />
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

          {/* Location tier — falls back to the category label so the line is never blank
              for a listing without a recorded city/region. */}
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-bone-500">
            <span aria-hidden className="shrink-0" style={{ color: `rgba(${category.rgb},0.75)` }}>
              <category.Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
            </span>
            <span className="truncate">
              {[locationText || category.label, subcatLabel].filter(Boolean).join(' · ')}
            </span>
          </p>

          {/* Price / offer-state (+ availability/close in its `meta`) — one line per
              commercial kind, never a meaningless field for the wrong sale method. */}
          <div className="mt-2.5">
            <Commercial lot={lot} />
          </div>

          {/* Quantity + unit — commodity/bulk listings only, e.g. "40 MT". */}
          {!compact && hasQuantity && (
            <p className="mt-1.5 text-xs text-bone-400">
              {formatQuantity(lot.quantity, lot.quantityUnitCode)}
            </p>
          )}

          {/* Sale method — quiet caption, never the raw enum. */}
          {!compact && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs capitalize text-bone-500">
              <SaleMethodIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
              {saleMethodLabel(lot.saleMethod)}
            </p>
          )}

          {/* Subtle logistics/pickup hint — only when the listing has one. */}
          {!compact && lot.collectionSummary && (
            <p className="mt-1.5 line-clamp-1 text-[11px] text-bone-600">
              <span className="text-bone-500">Pickup </span>
              {lot.collectionSummary}
            </p>
          )}

          {/* Exactly one primary action, pinned to the card's bottom edge so every card in
              a row lines up regardless of how much optional content sits above it. */}
          {!compact && (
            <span className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-coal-950 transition-colors duration-200 group-hover:bg-gold-400">
              {primaryActionLabel(lot.commercial.kind)}
            </span>
          )}
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
      return <Line label="" value="View listing" meta="" />;
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
