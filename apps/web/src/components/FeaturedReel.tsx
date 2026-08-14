'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { Chip } from '@singha/ui';
import { resolveAxis, useReducedMotion } from '@singha/auctionflow';
import type { CatalogueCardV2 } from '../lib/api';
import { coverUrl } from '../lib/media';
import { formatMoney, timeLeft } from '../lib/format';
import { LotImage } from './LotImage';

const AUTO_MS = 6500;
const VISIBLE = 2; // neighbours shown each side of the active lot

function info(c: CatalogueCardV2['commercial']): {
  method: string;
  price: string;
  time: string | null;
} {
  switch (c.kind) {
    case 'auction':
      return {
        method: 'Timed auction',
        price: formatMoney(c.currentBidMinor, c.currency),
        time: c.endsAt ? `Ends in ${timeLeft(c.endsAt)}` : null,
      };
    case 'buy_now':
      return { method: 'Buy now', price: formatMoney(c.priceMinor, c.currency), time: null };
    case 'eoi':
      return {
        method: 'Expression of interest',
        price: c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Register interest',
        time: c.closesAt ? `Closes in ${timeLeft(c.closesAt)}` : null,
      };
    case 'make_offer':
      return {
        method: 'Make an offer',
        price: c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Open to offers',
        time: null,
      };
    case 'sealed_tender':
      return {
        method: 'Sealed tender',
        price: c.guidePriceMinor ? formatMoney(c.guidePriceMinor, c.currency) : 'Submit sealed bid',
        time: c.closesAt ? `Closes in ${timeLeft(c.closesAt)}` : null,
      };
    default:
      return { method: '', price: '', time: null };
  }
}

/**
 * Cinematic Featured Items stage (pack doc 09). A revolving, fully-clickable
 * perspective showcase: one dominant central lot with neighbours in depth. Every
 * lot is a link; arrows/keyboard/drag navigate; it slowly auto-revolves on idle and
 * pauses on hover, focus, touch or when the tab is hidden. Reduced-motion disables
 * auto-rotation (it stays a manual snap carousel). Fixed-height stage → no CLS.
 */
export function FeaturedReel({ items }: { items: CatalogueCardV2[] }) {
  const reduced = useReducedMotion();
  const n = items.length;
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const drag = useRef<{ x: number; y: number; axis: 'horizontal' | 'vertical' | null } | null>(
    null,
  );

  const go = useCallback((delta: number) => setActive((a) => (((a + delta) % n) + n) % n), [n]);

  // Pause auto-revolve when the tab is hidden.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Slow auto-revolve on idle; the timer restarts on every change so a manual
  // interaction resets the idle countdown (pack doc 09).
  useEffect(() => {
    if (reduced || interacting || hidden || n <= 1) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % n), AUTO_MS);
    return () => clearTimeout(t);
  }, [reduced, interacting, hidden, n, active]);

  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, axis: null };
    setInteracting(true);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d && !d.axis) d.axis = resolveAxis(e.clientX - d.x, e.clientY - d.y);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d && d.axis === 'horizontal') go(e.clientX - d.x < 0 ? 1 : -1);
    // Leave `interacting` true briefly so a drag doesn't immediately auto-advance.
    setTimeout(() => setInteracting(false), 400);
  };

  if (n === 0) return null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured lots"
      className="relative"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      {/* Blurred atmospheric backdrop derived from the active lot (single image). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-25 blur-2xl"
      >
        {items[active]?.media.cover && (
          <img
            src={coverUrl(items[active]!.media.cover) ?? undefined}
            alt=""
            className="h-full w-full scale-110 object-cover"
          />
        )}
      </div>

      {/* Stage — fixed height so lazy images never shift layout (no CLS). */}
      <div
        className="relative mx-auto h-[340px] w-full touch-pan-y overflow-hidden sm:h-[440px]"
        style={{ perspective: '1600px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        {items.map((lot, i) => {
          const offset = i - active;
          const hiddenItem = Math.abs(offset) > VISIBLE;
          const meta = info(lot.commercial);
          return (
            <Link
              key={lot.id}
              href={`/lot/${lot.id}`}
              aria-hidden={hiddenItem}
              tabIndex={hiddenItem ? -1 : 0}
              onClick={(e) => {
                if (offset !== 0) {
                  e.preventDefault();
                  setActive(i);
                }
              }}
              className="absolute left-1/2 top-1/2 block aspect-[4/5] w-[54%] max-w-[360px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-500 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:w-[38%] motion-reduce:transition-none"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 62}%) translateZ(${-Math.abs(offset) * 220}px) rotateY(${offset * -34}deg) scale(${1 - Math.abs(offset) * 0.08})`,
                opacity: hiddenItem ? 0 : 1 - Math.abs(offset) * 0.35,
                zIndex: 50 - Math.abs(offset),
                pointerEvents: hiddenItem ? 'none' : 'auto',
              }}
            >
              <LotImage src={coverUrl(lot.media.cover)} alt={lot.title} aspect="aspect-[4/5]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-coal-950/95 via-coal-950/40 to-transparent" />
              {offset === 0 ? (
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <Chip tone="gold">{meta.method}</Chip>
                  <h3 className="mt-2 line-clamp-2 font-serif text-xl font-bold text-bone">
                    {lot.title}
                  </h3>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="tabular font-display text-2xl font-bold text-gold-400">
                      {meta.price}
                    </span>
                    {meta.time && <span className="text-xs text-bone-300">{meta.time}</span>}
                  </div>
                  <span className="mt-3 inline-block rounded-md bg-gold-500 px-4 py-1.5 text-sm font-semibold text-coal-950">
                    View lot →
                  </span>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="truncate text-sm font-medium text-bone-200">{lot.title}</p>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous featured lot"
            className="absolute left-2 top-1/2 z-[60] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-coal-900/70 text-lg text-bone-200 backdrop-blur transition hover:text-bone sm:left-6"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next featured lot"
            className="absolute right-2 top-1/2 z-[60] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-coal-900/70 text-lg text-bone-200 backdrop-blur transition hover:text-bone sm:right-6"
          >
            ›
          </button>
          <div className="mt-5 flex items-center justify-center gap-2">
            {items.map((lot, i) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show featured lot ${i + 1}`}
                aria-current={i === active}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-gold-400' : 'w-1.5 bg-white/25 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
