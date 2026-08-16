'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@singha/auctionflow';
import { fetchCatalogueRow, type CatalogueCardV2 } from '../../lib/api';
import { CompactLotCell } from './CompactLotCell';
import { CategoryOverlay } from './CategoryOverlay';

const PAGE_FETCH = 18; // cursor slice size
const LOOP_CAP = 40; // only loop reasonably-sized exhausted rails (doubled = ≤80 cells)

function dedupe(items: CatalogueCardV2[]): CatalogueCardV2[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/**
 * One band of the V3 Flow canvas (pack doc 08) — a SINGLE horizontal rail per category
 * (never a multi-row grid). The band owns its own cursor so every lot in the category is
 * reachable: it lazy-loads only when scrolled near the viewport (vertical virtualization)
 * and fetches the next cursor slice as the user nears the right end of the rail. It never
 * fakes a next page — the rail simply ends when the cursor is exhausted, and once exhausted
 * (and reasonably sized) it LOOPS: the loaded lots are duplicated so touch / trackpad / drag
 * scrolling wraps seamlessly at the halfway point. The mouse wheel scrolls the row
 * horizontally while the pointer is over it, releasing to normal page scroll at the ends so
 * the vertical page is never trapped. The big category name lives IN this band (aligned
 * with its row) and pops in on mouse-enter / touch, then fades itself out so it never sits
 * on the lots — there is no small heading at the top. Reduced-motion safe.
 */
export function FlowMatrixBand({
  category,
  label,
  saleMethod,
  search,
  showLabel = true,
}: {
  category: string;
  label: string;
  saleMethod?: string;
  search?: string;
  showLabel?: boolean;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const [items, setItems] = useState<CatalogueCardV2[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [near, setNear] = useState(false);
  const [poked, setPoked] = useState(false); // label "pop" on mouse-enter / touch
  const pokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheeling = useRef(false); // suppresses the loop-wrap during a wheel run
  const wheelReset = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pop the big label in, then fade it out ~1s later so it never sits on top of the lots.
  const poke = useCallback(() => {
    setPoked(true);
    if (pokeTimer.current) clearTimeout(pokeTimer.current);
    pokeTimer.current = setTimeout(() => setPoked(false), 1000);
  }, []);
  useEffect(
    () => () => {
      if (pokeTimer.current) clearTimeout(pokeTimer.current);
      if (wheelReset.current) clearTimeout(wheelReset.current);
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (loading || exhausted) return;
    setLoading(true);
    try {
      const r = await fetchCatalogueRow({
        category,
        saleMethod,
        search,
        sort: 'ending',
        limit: PAGE_FETCH,
        cursor: cursor ?? undefined,
      });
      setItems((prev) => dedupe([...prev, ...r.items]));
      setCursor(r.nextCursor);
      setExhausted(r.exhausted);
    } catch {
      setExhausted(true); // truthful stop, not a fake retry loop
    } finally {
      setLoading(false);
    }
  }, [category, saleMethod, search, cursor, loading, exhausted]);

  // Vertical virtualization: only fetch once the band is near the viewport.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && setNear(true), {
      rootMargin: '500px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (near && items.length === 0 && !loading && !exhausted) void loadMore();
  }, [near, items.length, loading, exhausted, loadMore]);

  // A fully-loaded, reasonably-sized rail can loop — the lots render twice and the scroll
  // wraps at the halfway point so touch / trackpad / drag reads as one endless rail. But
  // only when the single set actually OVERFLOWS the rail: a short rail that already fits (a
  // few lots on a wide screen) must not duplicate, or its cards simply render twice side by
  // side and read as duplicated content. `overflows` is measured, so the same rail loops at
  // 390px (overflowing) yet stays a single set at 1440px (fitting).
  const [overflows, setOverflows] = useState(false);
  const loop = exhausted && items.length > 1 && items.length <= LOOP_CAP && overflows;

  // Measure single-set overflow (halve the width while looping, since the rail then holds
  // two copies). ResizeObserver keeps it correct across viewport changes and lazy loads.
  useEffect(() => {
    const el = railRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const singleSet = loop ? el.scrollWidth / 2 : el.scrollWidth;
      setOverflows(singleSet - el.clientWidth > 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, loop]);

  const onScroll = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // Seamless forward loop for non-wheel input (the wheel handler manages its own ends).
    if (loop && !wheeling.current) {
      const half = el.scrollWidth / 2;
      if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
    }
    // Prefetch the next cursor slice as the user nears the right end (no-op once exhausted).
    if (loading || exhausted) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 320) void loadMore();
  }, [loop, loading, exhausted, loadMore]);

  // Mouse wheel over the rail scrolls it horizontally (bound natively so it can be
  // non-passive and preventDefault). At the true ends it releases to normal page scroll so
  // the vertical page is never trapped — the duplicated loop content gives a long run first.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll; let the page move
      if (e.deltaY === 0) return; // native horizontal (trackpad) already scrolls the rail
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return; // release to page
      e.preventDefault();
      wheeling.current = true;
      if (wheelReset.current) clearTimeout(wheelReset.current);
      wheelReset.current = setTimeout(() => (wheeling.current = false), 220);
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const nudge = useCallback(
    (dir: 1 | -1) => {
      const el = railRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  const display = loop ? [...items, ...items] : items;
  // Arrows only when the rail can actually scroll (measured overflow) — never over a rail
  // whose lots all fit, and never over the loading skeleton.
  const showArrows = items.length > 0 && overflows;

  return (
    <section
      ref={rootRef}
      className="group/band relative py-3"
      aria-roledescription="Flow band"
      onMouseEnter={showLabel ? poke : undefined}
    >
      {/* Real heading for assistive tech only — the visible name is the pop-in overlay. */}
      <h3 className="sr-only">{label}</h3>

      {showLabel && <CategoryOverlay label={label} active={poked} />}

      <div className="group/rail relative">
        <div
          ref={railRef}
          data-rail
          onScroll={onScroll}
          onPointerDown={showLabel ? (e) => e.pointerType === 'touch' && poke() : undefined}
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1 [scroll-snap-type:x_proximity]"
        >
          {display.map((lot, idx) => (
            <div
              key={loop ? `${lot.id}-${idx}` : lot.id}
              className="w-28 shrink-0 [scroll-snap-align:start] sm:w-32 lg:w-36"
            >
              <CompactLotCell lot={lot} />
            </div>
          ))}
          {near &&
            items.length === 0 &&
            Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="aspect-square w-28 shrink-0 animate-pulse rounded-xl bg-white/[0.04] sm:w-32 lg:w-36"
              />
            ))}
        </div>

        {showArrows && (
          <>
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label={`Scroll ${label} left`}
              className="absolute -left-3 top-[38%] z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-coal-900/85 p-2 text-bone-300 opacity-0 backdrop-blur transition hover:text-bone group-hover/rail:opacity-100 sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label={`Scroll ${label} right`}
              className="absolute -right-3 top-[38%] z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-coal-900/85 p-2 text-bone-300 opacity-0 backdrop-blur transition hover:text-bone group-hover/rail:opacity-100 sm:flex"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
