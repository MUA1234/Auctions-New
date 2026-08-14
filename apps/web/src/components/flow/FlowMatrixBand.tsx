'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@singha/auctionflow';
import { fetchCatalogueRow, type CatalogueCardV2 } from '../../lib/api';
import { CompactLotCell } from './CompactLotCell';

const PAGE_FETCH = 18; // cursor slice size

function dedupe(items: CatalogueCardV2[]): CatalogueCardV2[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/**
 * One band of the V3 Flow canvas (pack doc 08) — a SINGLE horizontal rail per category
 * (never a multi-row grid). The band owns its own cursor so every lot in the category is
 * reachable: it lazy-loads only when scrolled near the viewport (vertical virtualization)
 * and fetches the next cursor slice as the user nears the right end of the rail. It never
 * fakes a next page — the rail simply ends when the cursor is exhausted. Native horizontal
 * scroll on touch; discreet arrow controls on pointer devices. Reduced-motion safe.
 */
export function FlowMatrixBand({
  category,
  label,
  saleMethod,
  search,
}: {
  category: string;
  label: string;
  saleMethod?: string;
  search?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const [items, setItems] = useState<CatalogueCardV2[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [near, setNear] = useState(false);

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

  // Prefetch the next slice as the user scrolls near the right end of the rail.
  const onScroll = useCallback(() => {
    const el = railRef.current;
    if (!el || loading || exhausted) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 320) void loadMore();
  }, [loading, exhausted, loadMore]);

  const nudge = useCallback(
    (dir: 1 | -1) => {
      const el = railRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  const showArrows = items.length > 0 && (!exhausted || items.length > 4);

  return (
    <section ref={rootRef} className="py-3" aria-roledescription="Flow band">
      {/* Real semantic heading for assistive tech (the visual label is the overlay). */}
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-bone-500">
        {label}
        {items.length > 0 && (
          <span className="ml-2 font-normal normal-case tracking-normal text-bone-600">
            {items.length}
            {!exhausted ? '+' : ''}
          </span>
        )}
      </h3>

      <div className="group/rail relative">
        <div
          ref={railRef}
          data-rail
          onScroll={onScroll}
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1 [scroll-snap-type:x_proximity]"
        >
          {items.map((lot) => (
            <div key={lot.id} className="w-28 shrink-0 [scroll-snap-align:start] sm:w-32 lg:w-36">
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
              className="absolute -left-3 top-[38%] hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-coal-900/85 p-2 text-bone-300 opacity-0 backdrop-blur transition hover:text-bone group-hover/rail:opacity-100 sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label={`Scroll ${label} right`}
              className="absolute -right-3 top-[38%] hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-coal-900/85 p-2 text-bone-300 opacity-0 backdrop-blur transition hover:text-bone group-hover/rail:opacity-100 sm:flex"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
