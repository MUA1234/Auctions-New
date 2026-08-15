'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from '@singha/auctionflow';
import type { CatalogueCardV2 } from '../lib/api';
import { formatMoney, timeLeft } from '../lib/format';

/**
 * Hero showcase (V3 homepage) — a vertical 3D revolving carousel that fills the right half of
 * the desktop hero. Individual frosted-glass tiles ride a virtual wheel: the tile at the
 * centre faces the viewer, and tiles above/below rotate away (rotateX) with perspective, so
 * the column reads as a slowly-revolving cylinder. The tiles combine the featured lots
 * ("what's open now") with the editorial "why Singha" notes as centre-aligned ~2-line cards,
 * and the set loops seamlessly. Desktop-only (`hidden lg:block`); the mobile hero stays
 * copy-first. Constant medium-speed crawl via requestAnimationFrame (speed independent of
 * item count); pauses on hover so the copy is readable; under prefers-reduced-motion it holds
 * a static curved stack (no revolve).
 */

type ReelNote = { kind: 'note'; eyebrow: string; text: string };
type ReelLot = { kind: 'lot'; lot: CatalogueCardV2 };
type ReelCard = ReelNote | ReelLot;

const EDITORIAL: ReelNote[] = [
  { kind: 'note', eyebrow: 'Transparent', text: 'Every bid validated, sequenced and recorded' },
  { kind: 'note', eyebrow: 'Verified', text: 'Banks, corporates & government sellers' },
  {
    kind: 'note',
    eyebrow: 'Real-time',
    text: 'Server-authoritative — the screen is never the record',
  },
];

const TILE_H = 92; // fixed tile height (px) — uniform so the wheel maths stay analytic
const GAP = 14;
const STEP = TILE_H + GAP;
const SPEED_PX_PER_S = 40; // medium crawl — moving, but quick to read
const MIN_PER_COPY = 6; // repeat the set until one copy overfills the viewport (seamless loop)
const PERSPECTIVE = 1000;
const MAX_ANGLE = 56; // degrees a tile is rotated at the top/bottom of the wheel

function buildCards(items: CatalogueCardV2[]): ReelCard[] {
  const lots: ReelCard[] = items.slice(0, 8).map((lot) => ({ kind: 'lot', lot }));
  return [...lots, ...EDITORIAL];
}

/** Repeat the base set a WHOLE number of times so one copy comfortably fills the viewport. */
function fill(base: ReelCard[]): ReelCard[] {
  if (base.length === 0) return base;
  const reps = Math.max(1, Math.ceil(MIN_PER_COPY / base.length));
  return Array.from({ length: reps }, () => base).flat();
}

export function HeroShowcase({ items }: { items: CatalogueCardV2[] }) {
  const reduced = useReducedMotion();
  const cards = fill(buildCards(items));
  const copyHeight = cards.length * STEP; // one full loop of the wheel

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const vhRef = useRef(480);

  // Place the track + revolve each tile according to its distance from the wheel centre.
  const apply = (offset: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translateY(${-offset}px)`;
    const vh = vhRef.current;
    const kids = track.children;
    for (let j = 0; j < kids.length; j++) {
      const el = kids[j] as HTMLElement;
      const centre = j * STEP + TILE_H / 2 - offset; // tile centre, relative to viewport top
      const n = Math.max(-1.6, Math.min(1.6, (centre - vh / 2) / (vh / 2)));
      const angle = -n * MAX_ANGLE;
      const scale = 1 - Math.min(0.34, Math.abs(n) * 0.26);
      el.style.transform = `rotateX(${angle}deg) scale(${scale})`;
      el.style.opacity = String(Math.max(0.18, 1 - Math.abs(n) * 0.72));
    }
  };

  useLayoutEffect(() => {
    if (viewportRef.current) vhRef.current = viewportRef.current.clientHeight || 480;
    apply(offsetRef.current); // paint the curved stack immediately (also the reduced-motion view)
  }, [cards.length, reduced]);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      if (!last) last = t;
      const dt = Math.min(0.05, (t - last) / 1000); // clamp tab-switch jumps
      last = t;
      if (!pausedRef.current) {
        offsetRef.current += SPEED_PX_PER_S * dt;
        if (offsetRef.current >= copyHeight) offsetRef.current -= copyHeight;
        apply(offsetRef.current);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, copyHeight]);

  return (
    <div
      className="relative hidden h-[30rem] w-full overflow-hidden lg:block"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)',
      }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      role="group"
      aria-label="Featured lots and why Singha"
    >
      <div ref={viewportRef} className="h-full" style={{ perspective: `${PERSPECTIVE}px` }}>
        <div
          ref={trackRef}
          className="flex flex-col px-3 will-change-transform"
          style={{ gap: `${GAP}px`, transformStyle: 'preserve-3d' }}
        >
          {[...cards, ...cards].map((c, i) => (
            <ReelTile key={i} card={c} muted={i >= cards.length} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReelTile({ card, muted }: { card: ReelCard; muted?: boolean }) {
  return (
    <div
      aria-hidden={muted || undefined}
      style={{
        height: TILE_H,
        // Frosted-glass tile. `backdrop-filter` can't be used here — it doesn't compose with
        // the 3D wheel transform — so the glass is a translucent dark gradient instead; it
        // still floats over the forest, with an inset top highlight for the glass rim and a
        // drop shadow for depth.
        background: 'linear-gradient(157deg, rgba(14,16,20,0.78), rgba(6,7,9,0.88))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -16px rgba(0,0,0,0.82)',
      }}
      className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-white/[0.14] px-5 text-center will-change-transform"
    >
      {card.kind === 'note' ? (
        <>
          <p className="eyebrow">{card.eyebrow}</p>
          <p className="mt-1 line-clamp-2 font-serif text-[0.95rem] font-semibold leading-snug text-bone">
            {card.text}
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow">{card.lot.category}</p>
          <p className="mt-0.5 line-clamp-1 font-display text-sm font-semibold text-bone">
            {card.lot.title}
          </p>
          <p className="mt-1 text-[11px]">
            <span className="tabular font-semibold text-gold-400">{commercialValue(card.lot)}</span>
            <span className="text-bone-400"> · {commercialMeta(card.lot)}</span>
          </p>
        </>
      )}
    </div>
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
