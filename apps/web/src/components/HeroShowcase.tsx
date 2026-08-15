'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { useReducedMotion } from '@singha/auctionflow';
import type { CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

/**
 * Hero showcase (V3 homepage) — a frosted-glass, auto-scrolling reel that fills the right
 * half of the desktop hero. It scrolls a single continuous, seamlessly-looping column of
 * ~2-line cards combining the featured lots ("what's open now") with the editorial "why
 * Singha" notes, in the style of a news reel. Desktop-only (`hidden lg:block`) — the mobile
 * hero stays copy-first. The motion is a constant, medium-speed vertical crawl driven by
 * requestAnimationFrame (so the loop speed is independent of item count); it pauses on hover
 * / keyboard focus so the copy is readable and lots are clickable, and honours
 * prefers-reduced-motion (no crawl — a static, top-anchored list). Media is CSP-safe
 * (LotImage → Supabase cover or house gradient).
 */

type ReelNote = { kind: 'note'; eyebrow: string; text: string };
type ReelLot = { kind: 'lot'; lot: CatalogueCardV2 };
type ReelCard = ReelNote | ReelLot;

/** The editorial "why Singha" notes, shown in the reel alongside live lots. */
const EDITORIAL: ReelNote[] = [
  { kind: 'note', eyebrow: 'Transparent', text: 'Every bid validated, sequenced and recorded' },
  { kind: 'note', eyebrow: 'Verified', text: 'Banks, corporates & government sellers' },
  {
    kind: 'note',
    eyebrow: 'Real-time',
    text: 'Server-authoritative — the screen is never the record',
  },
];

const SPEED_PX_PER_S = 40; // medium crawl — moving, but quick to read
const MIN_PER_COPY = 8; // repeat the set until one copy overfills the panel (seamless loop)

/** Featured lots first (the "news"), then the editorial notes. */
function buildCards(items: CatalogueCardV2[]): ReelCard[] {
  const lots: ReelCard[] = items.slice(0, 8).map((lot) => ({ kind: 'lot', lot }));
  return [...lots, ...EDITORIAL];
}

/** Repeat the base set a WHOLE number of times so one copy comfortably fills the viewport
 *  (prevents a blank gap at the loop seam when there are only a few items). */
function fill(base: ReelCard[]): ReelCard[] {
  if (base.length === 0) return base;
  const reps = Math.max(1, Math.ceil(MIN_PER_COPY / base.length));
  return Array.from({ length: reps }, () => base).flat();
}

export function HeroShowcase({ items }: { items: CatalogueCardV2[] }) {
  const reduced = useReducedMotion();
  const cards = fill(buildCards(items));

  const trackRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null); // top of the 2nd (duplicate) copy
  const wrapRef = useRef(0); // px to travel before the loop resets
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);

  // Measure the loop distance (height of one copy incl. the gap to the next), and keep it
  // fresh as fonts/sizes settle or the viewport resizes.
  useLayoutEffect(() => {
    const measure = () => {
      if (seamRef.current) wrapRef.current = seamRef.current.offsetTop;
    };
    measure();
    if (typeof ResizeObserver === 'undefined' || !trackRef.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [cards.length]);

  // Constant-speed vertical crawl, seamless wrap. Skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      if (!last) last = t;
      const dt = Math.min(0.05, (t - last) / 1000); // clamp tab-switch jumps
      last = t;
      const wrap = wrapRef.current;
      const el = trackRef.current;
      if (el && wrap > 0 && !pausedRef.current) {
        offsetRef.current += SPEED_PX_PER_S * dt;
        if (offsetRef.current >= wrap) offsetRef.current -= wrap;
        el.style.transform = `translateY(${-offsetRef.current}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, cards.length]);

  const pause = () => (pausedRef.current = true);
  const resume = () => (pausedRef.current = false);

  return (
    <div
      className="relative hidden h-[30rem] w-full overflow-hidden rounded-3xl border border-white/10 bg-coal-950/30 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-2xl lg:block"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      role="group"
      aria-label="Featured lots and why Singha"
    >
      {/* Frosted-glass surface: subtle brand glows + a soft dark tint for legibility. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 30% 20%, rgba(31,160,85,0.12), transparent 60%), radial-gradient(60% 55% at 85% 90%, rgba(201,162,75,0.09), transparent 65%), linear-gradient(180deg, rgba(255,255,255,0.07), transparent 20%), linear-gradient(160deg, rgba(16,16,18,0.10), rgba(9,9,10,0.24))',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Reel viewport — cards fade in/out at the top and bottom edges. */}
      <div
        className="relative h-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
        }}
      >
        <div ref={trackRef} className="relative flex flex-col gap-3 px-7 will-change-transform">
          <div className="flex flex-col gap-3">
            {cards.map((c, i) => (
              <ReelCardView key={`a-${i}`} card={c} />
            ))}
          </div>
          {/* Seamless-loop duplicate — hidden from assistive tech and the tab order. */}
          <div ref={seamRef} aria-hidden className="flex flex-col gap-3">
            {cards.map((c, i) => (
              <ReelCardView key={`b-${i}`} card={c} muted />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReelCardView({ card, muted }: { card: ReelCard; muted?: boolean }) {
  if (card.kind === 'note') {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p className="eyebrow">{card.eyebrow}</p>
        <p className="mt-1 line-clamp-2 font-serif text-[0.95rem] font-semibold leading-snug text-bone">
          {card.text}
        </p>
      </div>
    );
  }

  const { lot } = card;
  return (
    <Link
      href={`/lot/${lot.id}`}
      tabIndex={muted ? -1 : undefined}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 transition-colors hover:border-gold-400/30 hover:bg-white/[0.06]"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
        <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-square" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="eyebrow truncate">{lot.category}</p>
        <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-bone group-hover:text-white">
          {lot.title}
        </p>
        <p className="mt-0.5 truncate text-[11px]">
          <span className="tabular font-semibold text-gold-400">{commercialValue(lot)}</span>
          <span className="text-bone-500"> · {commercialMeta(lot)}</span>
        </p>
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
