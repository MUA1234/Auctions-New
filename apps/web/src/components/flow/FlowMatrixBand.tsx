'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  faceItems,
  matrixPageSize,
  pageCount,
  resolveAxis,
  swipeDelta,
  useMatrixLayout,
  useReducedMotion,
} from '@singha/auctionflow';
import { fetchCatalogueRow, type CatalogueCardV2 } from '../../lib/api';
import { CompactLotCell } from './CompactLotCell';

const PAGE_FETCH = 18; // cursor slice size (covers the densest desktop matrix page)

function dedupe(items: CatalogueCardV2[]): CatalogueCardV2[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/**
 * One band of the V3 Infinite Flow canvas (pack doc 08). Horizontal movement pages
 * a 2-D `columns × rows` matrix of compact cells; the band owns its own cursor so
 * every lot in the category is reachable. It lazy-loads only when scrolled near the
 * viewport (vertical virtualization), prefetches the next cursor slice as the user
 * nears the last loaded page, and never fakes a next page when the cursor is
 * exhausted. A band that fits one page is fully static (no controls/gestures).
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
  const gridRef = useRef<HTMLDivElement>(null);
  const layout = useMatrixLayout(gridRef);
  const pageSize = matrixPageSize(layout);
  const reduced = useReducedMotion();

  const [items, setItems] = useState<CatalogueCardV2[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [near, setNear] = useState(false); // scrolled close enough to load
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, pageCount(items.length, pageSize));

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
      rootMargin: '400px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (near && items.length === 0 && !loading && !exhausted) void loadMore();
  }, [near, items.length, loading, exhausted, loadMore]);

  // Prefetch the next slice as the user reaches the last loaded matrix page.
  useEffect(() => {
    if (near && page >= totalPages - 1 && !exhausted && !loading) void loadMore();
  }, [near, page, totalPages, exhausted, loading, loadMore]);

  // Keep the page index valid if the layout (page size) changes on resize.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const go = useCallback(
    (delta: number) => setPage((p) => Math.max(0, Math.min(p + delta, totalPages - 1))),
    [totalPages],
  );

  // Direction-locked horizontal paging. Vertical intent is left to native scroll —
  // we never preventDefault the vertical axis (pack doc 08 gesture rules).
  const drag = useRef<{ x: number; y: number; axis: 'horizontal' | 'vertical' | null } | null>(
    null,
  );
  const onPointerDown = (e: ReactPointerEvent) => {
    if (totalPages <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, axis: null };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.axis) d.axis = resolveAxis(e.clientX - d.x, e.clientY - d.y);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== 'horizontal') return;
    const width = gridRef.current?.clientWidth ?? 1;
    go(swipeDelta(e.clientX - d.x, width));
  };

  const showControls = totalPages > 1;

  return (
    <section ref={rootRef} className="py-4" aria-roledescription="Flow band">
      {/* Real semantic heading for assistive tech (the visual label is the overlay). */}
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-bone-500">
        {label}
        {showControls && (
          <span className="ml-2 font-normal normal-case tracking-normal text-bone-600">
            {page + 1}/{totalPages}
            {!exhausted ? '+' : ''}
          </span>
        )}
      </h3>

      <div className="relative">
        {/* Bounded viewport — the matrix page transition is clipped locally so a
            page never leaks outside the band (pack doc 08 "local overflow: clip"). */}
        <div
          className="overflow-clip"
          style={{ perspective: '1400px' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
        >
          <div
            ref={gridRef}
            className="flex"
            style={{
              transform: `translateX(-${page * 100}%)`,
              transition: reduced ? 'none' : 'transform 420ms cubic-bezier(0.22,0.61,0.36,1)',
            }}
          >
            {Array.from({ length: totalPages }, (_, p) => (
              <div
                key={p}
                className="grid w-full shrink-0 gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                }}
              >
                {faceItems(items, p, pageSize).map((lot) => (
                  <CompactLotCell key={lot.id} lot={lot} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {showControls && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={page === 0}
              aria-label={`Previous ${label} lots`}
              className="absolute -left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-coal-900/80 p-2 text-bone-300 backdrop-blur transition hover:text-bone disabled:opacity-30 sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={page >= totalPages - 1 && exhausted}
              aria-label={`More ${label} lots`}
              className="absolute -right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-coal-900/80 p-2 text-bone-300 backdrop-blur transition hover:text-bone disabled:opacity-30 sm:flex"
            >
              ›
            </button>
          </>
        )}

        {near && items.length === 0 && (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: pageSize }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
