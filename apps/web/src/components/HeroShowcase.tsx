'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from '@singha/auctionflow';
import type { CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

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

/** A Market Pulse "news" entry shown in the reel between the featured lots. */
export type HeroNews = { eyebrow: string; text: string; image?: string | null };

type ReelNote = { kind: 'note' } & HeroNews;
type ReelLot = { kind: 'lot'; lot: CatalogueCardV2 };
type ReelCard = ReelNote | ReelLot;

const TILE_H = 122; // fixed tile height (px) — uniform so the wheel maths stay analytic
const GAP = 16;
const STEP = TILE_H + GAP;
const SPEED_PX_PER_S = 40; // medium crawl — moving, but quick to read
const MIN_PER_COPY = 6; // repeat the set until one copy overfills the viewport (seamless loop)
const PERSPECTIVE = 1000;
const MAX_ANGLE = 56; // degrees a tile is rotated at the top/bottom of the wheel

function buildCards(items: CatalogueCardV2[], news: HeroNews[]): ReelCard[] {
  const lots: ReelCard[] = items.slice(0, 8).map((lot) => ({ kind: 'lot', lot }));
  const notes: ReelCard[] = news.map((n) => ({ kind: 'note', ...n }));
  // Interleave featured lots with the Market Pulse news so the reel mixes both.
  const out: ReelCard[] = [];
  for (let i = 0; i < Math.max(lots.length, notes.length); i++) {
    const l = lots[i];
    if (l) out.push(l);
    const n = notes[i];
    if (n) out.push(n);
  }
  return out;
}

/** Repeat the base set a WHOLE number of times so one copy comfortably fills the viewport. */
function fill(base: ReelCard[]): ReelCard[] {
  if (base.length === 0) return base;
  const reps = Math.max(1, Math.ceil(MIN_PER_COPY / base.length));
  return Array.from({ length: reps }, () => base).flat();
}

export function HeroShowcase({
  items,
  news = [],
}: {
  items: CatalogueCardV2[];
  news?: HeroNews[];
}) {
  const reduced = useReducedMotion();
  const cards = fill(buildCards(items, news));
  const copyHeight = cards.length * STEP; // one full loop of the wheel

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const vhRef = useRef(608);

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
    if (viewportRef.current) vhRef.current = viewportRef.current.clientHeight || 608;
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
      className="relative hidden h-[38rem] w-full overflow-hidden lg:block"
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
  // Lots always show media (real cover or the house fallback); news only when it has a pic.
  const image = card.kind === 'lot' ? coverUrl(card.lot.media.cover) : (card.image ?? null);
  const withMedia = card.kind === 'lot' || !!image;
  return (
    <div
      aria-hidden={muted || undefined}
      style={{
        height: TILE_H,
        // Frosted-glass tile. `backdrop-filter` can't be used here — it doesn't compose with
        // the 3D wheel transform — so the glass is a translucent dark scrim over the item
        // image (or a dark gradient when there's no picture), with an inset top highlight for
        // the glass rim and a drop shadow for depth.
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -16px rgba(0,0,0,0.82)',
      }}
      className="relative shrink-0 overflow-hidden rounded-2xl border border-white/[0.14] text-center will-change-transform"
    >
      {/* Item image where available — lots always show media (cover or the house fallback),
          editorial notes only when they carry a picture. */}
      {withMedia ? (
        <div className="absolute inset-0">
          <LotImage src={image} alt="" aspect="" className="h-full" />
        </div>
      ) : null}
      {/* Dark glass scrim — keeps the copy legible and holds the dark look over the photo. */}
      <div
        className="absolute inset-0"
        style={{
          background: withMedia
            ? 'linear-gradient(180deg, rgba(6,8,11,0.4) 0%, rgba(6,8,11,0.54) 50%, rgba(6,8,11,0.74) 100%)'
            : 'linear-gradient(157deg, rgba(14,16,20,0.78), rgba(6,7,9,0.88))',
        }}
      />
      <div
        className="relative flex h-full flex-col items-center justify-center px-5"
        style={{ textShadow: '0 1px 10px rgba(0,0,0,0.55)' }}
      >
        {card.kind === 'note' ? (
          <>
            <p className="eyebrow">{card.eyebrow}</p>
            <p className="mt-2.5 line-clamp-2 font-serif text-lg font-semibold leading-snug text-bone">
              {card.text}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">{card.lot.category}</p>
            <p className="mt-2 line-clamp-1 font-display text-lg font-semibold text-bone">
              {card.lot.title}
            </p>
            <p className="mt-2 text-sm">
              <span className="tabular font-semibold text-gold-400">
                {commercialValue(card.lot)}
              </span>
              <span className="text-bone-300"> · {commercialMeta(card.lot)}</span>
            </p>
          </>
        )}
      </div>
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
