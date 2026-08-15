'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Chip } from '@singha/ui';
import { useReducedMotion } from '@singha/auctionflow';
import type { CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

/**
 * Cinematic hero showcase (V3 homepage). Fills the right half of the desktop hero with a
 * layered, gently parallaxed stack of real featured lots — depth and motion communicate
 * "a live marketplace", not decoration. It is desktop-only (`hidden lg:block`): the mobile
 * hero stays copy-first and fast per the brief. Honours prefers-reduced-motion (no tilt),
 * has no layout shift (fixed plate sizes), and degrades to an editorial panel when there
 * are no featured lots. Media is CSP-safe (LotImage → Supabase cover or house gradient).
 */
export function HeroShowcase({ items }: { items: CatalogueCardV2[] }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setTilt({ x: px, y: py }));
    },
    [reduced],
  );

  const reset = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setTilt({ x: 0, y: 0 });
  }, []);

  const lots = items.slice(0, 3);

  if (lots.length === 0) return <EditorialPanel />;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="relative hidden h-[30rem] w-full select-none lg:block"
      style={{ perspective: '1400px' }}
      aria-hidden
    >
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: reduced ? undefined : `rotateY(${tilt.x * 7}deg) rotateX(${-tilt.y * 7}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {lots.map((lot, i) => (
          <Plate key={lot.id} lot={lot} index={i} tilt={tilt} reduced={reduced} />
        ))}
      </div>
    </div>
  );
}

const LAYOUT = [
  // front, then two receding plates — deliberate asymmetry, no fake symmetry
  { top: '14%', left: '18%', w: '17rem', rot: -4, z: 30, depth: 60, dim: '' },
  { top: '4%', left: '46%', w: '14rem', rot: 5, z: 20, depth: 20, dim: 'opacity-90' },
  { top: '52%', left: '48%', w: '13rem', rot: 3, z: 10, depth: -20, dim: 'opacity-80' },
] as const;

function Plate({
  lot,
  index,
  tilt,
  reduced,
}: {
  lot: CatalogueCardV2;
  index: number;
  tilt: { x: number; y: number };
  reduced: boolean;
}) {
  const l = LAYOUT[index] ?? LAYOUT[0];
  const parallax = reduced ? 0 : (l.depth / 60) * tilt.x * 18;
  return (
    <Link
      href={`/lot/${lot.id}`}
      className={`group pointer-events-auto absolute block ${l.dim}`}
      style={{
        top: l.top,
        left: l.left,
        width: l.w,
        transform: `translateX(${parallax}px) translateZ(${l.depth}px) rotate(${l.rot}deg)`,
        zIndex: l.z,
      }}
    >
      <div className="card-premium overflow-hidden p-2.5 shadow-card-lg">
        <div className="relative overflow-hidden rounded-lg">
          <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-[5/4]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coal-950/90 via-coal-950/20 to-transparent" />
          <div className="absolute left-2 top-2">
            <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
          </div>
          {lot.featured && (
            <span className="absolute right-2 top-2 text-sm text-gold-300" aria-hidden>
              ★
            </span>
          )}
        </div>
        <div className="mt-2.5">
          <h3 className="line-clamp-1 font-display text-sm font-semibold text-bone">{lot.title}</h3>
          <p className="mt-0.5 text-[11px] capitalize text-bone-500">{lot.category}</p>
          <div className="mt-2 flex items-end justify-between border-t border-white/[0.06] pt-2">
            <span className="tabular font-display text-base font-bold text-gold-400">
              {commercialValue(lot)}
            </span>
            <span className="text-[11px] text-bone-400">{commercialMeta(lot)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function commercialValue(lot: CatalogueCardV2): string {
  const c = lot.commercial;
  switch (c.kind) {
    case 'auction':
      return formatMoney(c.currentBidMinor, c.currency);
    case 'buy_now':
      return formatMoney(c.priceMinor, c.currency);
    case 'eoi':
    case 'make_offer':
    case 'sealed_tender':
      return c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Open';
    default:
      return 'View';
  }
}

function commercialMeta(lot: CatalogueCardV2): string {
  const c = lot.commercial;
  if (c.kind === 'auction' && c.endsAt) return `Ends ${timeLeft(c.endsAt)}`;
  if ((c.kind === 'eoi' || c.kind === 'sealed_tender') && c.closesAt)
    return `Closes ${timeLeft(c.closesAt)}`;
  return lot.saleMethod.replace(/_/g, ' ').toLowerCase();
}

/** Fallback when there are no featured lots — an editorial depth panel, never a blank half. */
function EditorialPanel() {
  const points = [
    { k: 'Transparent', v: 'Every bid validated, sequenced and recorded' },
    { k: 'Verified', v: 'Banks, corporates & government sellers' },
    { k: 'Real-time', v: 'Server-authoritative — the screen is never the record' },
  ];
  return (
    <div className="relative hidden h-[30rem] w-full overflow-hidden rounded-3xl border border-white/10 bg-coal-950/30 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-2xl lg:block">
      {/* Frosted-glass surface: subtle brand glows + a soft dark tint that keeps the copy
          legible, while the backdrop-blur above lets the forest show through the pane. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 30% 20%, rgba(31,160,85,0.12), transparent 60%), radial-gradient(60% 55% at 85% 90%, rgba(201,162,75,0.09), transparent 65%), linear-gradient(180deg, rgba(255,255,255,0.07), transparent 20%), linear-gradient(160deg, rgba(16,16,18,0.10), rgba(9,9,10,0.24))',
        }}
      />
      {/* Hairline highlight along the top edge — the classic glass rim. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="relative flex h-full flex-col justify-center gap-6 p-10">
        {points.map((p) => (
          <div key={p.k} className="flex flex-col gap-1">
            <span className="eyebrow">{p.k}</span>
            <span className="font-serif text-xl font-semibold text-bone">{p.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
