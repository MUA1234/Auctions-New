'use client';

import Link from 'next/link';
import { Card, Chip } from '@singha/ui';
import type { CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

/**
 * Sale-aware catalogue card (consolidated pack docs 04/07). It renders a
 * DIFFERENT commercial line per sale method from the discriminated `commercial`
 * payload — an EOI card never shows a bid, a Buy Now shows a fixed price, etc.
 */
export function SaleCard({ lot, compact = false }: { lot: CatalogueCardV2; compact?: boolean }) {
  return (
    <Link href={`/lot/${lot.id}`} className="block h-full">
      <Card className="flex h-full flex-col gap-3 transition-colors hover:border-red-500/30">
        <div className="flex items-center justify-between">
          <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
          <div className="flex items-center gap-2 text-[11px] text-bone-500">
            {lot.featured && <span className="text-gold-400">★ Featured</span>}
            {lot.watchers > 0 && <span>♥ {lot.watchers}</span>}
          </div>
        </div>
        <div className="hud-cut-sm relative overflow-hidden rounded-md">
          <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-[4/3]" />
          {lot.media.videoAvailable && (
            <span className="absolute bottom-2 right-2 rounded bg-coal-950/80 px-1.5 py-0.5 text-[10px] text-bone-300">
              ▶ Video
            </span>
          )}
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-bone">{lot.title}</h3>
          {!compact && lot.shortDescription && (
            <p className="mt-1 line-clamp-2 text-xs text-bone-500">{lot.shortDescription}</p>
          )}
          <p className="mt-1 text-xs capitalize text-bone-500">
            {lot.category}
            {lot.location?.city ? ` · ${lot.location.city}` : ''}
          </p>
        </div>
        <div className="mt-auto">
          <Commercial lot={lot} />
        </div>
      </Card>
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
