'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, Chip } from '@singha/ui';
import { AuctionFlowViewport, CubeRow } from '@singha/auctionflow';
import {
  fetchCatalogueRow,
  fetchCatalogueV2,
  type CatalogueCardV2,
  type CatalogueResponse,
} from '../lib/api';
import { SaleCard } from './SaleCard';
import { FlowCanvas } from './flow/FlowCanvas';
import { useFlags } from '../lib/use-flags';
import {
  categoryMeta,
  saleMethodIcon,
  saleMethodLabel,
  AllCategoriesIcon,
  AllMethodsIcon,
} from '../lib/categories';

// Customer-facing view names are Flow | Grid | List (Revision 05 §4). The internal
// primitives keep their names (CubeRow, AuctionFlowViewport, `flow` id) — only the
// label the customer reads is "Flow"; we never show "Rubik".
type ViewMode = 'flow' | 'grid' | 'list';
const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'flow', label: 'Flow' },
  { id: 'grid', label: 'Grid' },
  { id: 'list', label: 'List' },
];
// V3 (pack doc 08): Ending Soon is the primary/default sort, listed first — the
// backend enforces the same default when `sort` is omitted, so the two agree.
const SORTS = [
  { id: 'ending', label: 'Ending soon' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_desc', label: 'Price high→low' },
  { id: 'price_asc', label: 'Price low→high' },
];

/**
 * Catalogue (Revision 05 §4–§7). The default "Flow" view is independent horizontal
 * category BANDS (not a literal cube). All filtering, search and pagination happen
 * SERVER-SIDE via /api/v2/catalogue — we never download all inventory and filter in
 * React. Flow bands are SEEDED immediately from the initial catalogue page so the
 * view appears at once, then each band background-loads its own cursor slice.
 * Filter/search state persists across view switches.
 */
export function CatalogueBrowser({
  initialCategory = '',
  initialSaleMethod = '',
}: {
  initialCategory?: string;
  initialSaleMethod?: string;
} = {}) {
  const { flags } = useFlags();
  const [view, setView] = useState<ViewMode>('flow');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string>(initialCategory);
  const [saleMethod, setSaleMethod] = useState<string>(initialSaleMethod);
  const [sort, setSort] = useState('ending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CatalogueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // In Flow mode we pull a larger page so bands can be seeded across many
  // categories at once (density target: 7–10 bands, Revision 05 §7).
  const limit = view === 'flow' ? 60 : 24;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchCatalogueV2({ search: debounced, category, saleMethod, sort, page, limit })
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced, category, saleMethod, sort, page, limit, reloadKey]);

  // Reset to page 1 whenever filters change.
  useEffect(() => setPage(1), [debounced, category, saleMethod, sort]);

  // Flow bands are driven by the category facet (all categories), each loading
  // its own cursor slice — not the first global page. A selected category filter
  // narrows to that single band.
  const flowCategories = useMemo(() => {
    if (category) return [category];
    return (data?.facets.category ?? []).map((f) => f.value);
  }, [category, data]);

  // Seed each band instantly from the already-loaded first catalogue page,
  // grouped by category (Revision 05 §6) — the band then background-loads more.
  const seedByCategory = useMemo(() => {
    const map: Record<string, CatalogueCardV2[]> = {};
    for (const lot of data?.items ?? []) {
      (map[lot.category] ??= []).push(lot);
    }
    return map;
  }, [data]);

  return (
    <div className="mt-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterLabel>Category</FilterLabel>
          <FilterChip
            active={category === ''}
            onClick={() => setCategory('')}
            icon={<AllCategoriesIcon className="h-4 w-4" strokeWidth={1.6} />}
          >
            All
          </FilterChip>
          {(data?.facets.category ?? []).map((f) => {
            const meta = categoryMeta(f.value);
            return (
              <FilterChip
                key={f.value}
                active={category === f.value}
                onClick={() => setCategory(f.value)}
                tint={meta.rgb}
                count={f.count}
                icon={<meta.Icon className="h-4 w-4" strokeWidth={1.6} />}
              >
                {f.value}
              </FilterChip>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lots…"
            className="w-44 rounded-md border border-white/10 bg-coal-900/60 px-3 py-1.5 text-sm text-bone placeholder:text-bone-600 focus:border-red-500/40 focus:outline-none"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-white/10 bg-coal-900/60 px-2 py-1.5 text-xs text-bone-300"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-md border border-white/10">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === v.id ? 'bg-red-500/15 text-bone' : 'text-bone-400 hover:text-bone-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sale-method sub-filter */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FilterLabel>Sale method</FilterLabel>
        <FilterChip
          active={saleMethod === ''}
          onClick={() => setSaleMethod('')}
          icon={<AllMethodsIcon className="h-3.5 w-3.5" strokeWidth={1.6} />}
          small
        >
          All methods
        </FilterChip>
        {(data?.facets.saleMethod ?? []).map((f) => {
          const Icon = saleMethodIcon(f.value);
          return (
            <FilterChip
              key={f.value}
              active={saleMethod === f.value}
              onClick={() => setSaleMethod(f.value)}
              count={f.count}
              icon={<Icon className="h-3.5 w-3.5" strokeWidth={1.6} />}
              small
            >
              {saleMethodLabel(f.value)}
            </FilterChip>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-bone-500">
        {loading && !data
          ? 'Loading…'
          : error && !data
            ? 'Couldn’t reach the catalogue'
            : `${data?.total ?? 0} lots`}
      </p>

      {error && !data ? (
        <Card className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-bone-300">We couldn’t load the catalogue just now.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-md border border-amber-300/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
          >
            Retry
          </button>
        </Card>
      ) : loading && !data ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <Card className="mt-6 py-10 text-center">
          <p className="text-bone-300">No lots match your filters.</p>
          <p className="mt-1 text-sm text-bone-500">Try clearing the category or search.</p>
        </Card>
      ) : view === 'flow' ? (
        // V3 Infinite Flow Canvas behind flowMatrixV3 (pack doc 08); the current
        // edge-hinged band Flow stays until the flag is enabled server-side.
        flags.flowMatrixV3 ? (
          <FlowCanvas categories={flowCategories} saleMethod={saleMethod} search={debounced} />
        ) : (
          <FlowBands
            categories={flowCategories}
            seedByCategory={seedByCategory}
            search={debounced}
            saleMethod={saleMethod}
            sort={sort}
          />
        )
      ) : view === 'grid' ? (
        <>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((lot) => (
              <SaleCard key={lot.id} lot={lot} />
            ))}
          </div>
          <Pager data={data} page={page} setPage={setPage} />
        </>
      ) : (
        <>
          <ListView items={data?.items ?? []} />
          <Pager data={data} page={page} setPage={setPage} />
        </>
      )}
    </div>
  );
}

/**
 * Flow = a stack of INDEPENDENT 3D-rotating category rows (Revision 05 §4–§7) —
 * not a literal six-sided cube, and not a single rail that rotates every category
 * together. Each row is a `CubeRow` from `@singha/auctionflow` keyed by a stable
 * category id, so rotating one row never touches another and a realtime bid never
 * resets a row. Horizontal drag/arrow/keys rotate a row; vertical intent still
 * scrolls the page normally (direction lock lives in the package).
 */
function FlowBands({
  categories,
  seedByCategory,
  search,
  saleMethod,
  sort,
}: {
  categories: string[];
  seedByCategory: Record<string, CatalogueCardV2[]>;
  search: string;
  saleMethod: string;
  sort: string;
}) {
  return (
    <AuctionFlowViewport>
      <p className="mt-6 text-xs text-bone-500">
        Browse in Flow — swipe or use the arrows to move through each category.
      </p>
      <div className="mt-3 text-bone">
        {categories.map((category) => (
          <CategoryBand
            key={category}
            category={category}
            seedItems={seedByCategory[category] ?? []}
            search={search}
            saleMethod={saleMethod}
            sort={sort}
          />
        ))}
      </div>
    </AuctionFlowViewport>
  );
}

/**
 * One Flow row that owns its OWN cursor (Revision 05 §5/§6). It is SEEDED
 * instantly from the initial catalogue page, then background-loads its first row
 * slice and appends more when the user rotates near the last face (`onNearEnd`).
 * Appending never resets the visible face because CubeRow keys position by rowId.
 *
 * Blank-screen contract (§5): a request FAILURE never silently disappears — it
 * keeps whatever items are already visible, surfaces a small retryable error, and
 * NEVER marks the row `exhausted`. `exhausted` means only that the backend
 * confirmed there are no more results. A row with items never returns null.
 */
function CategoryBand({
  category,
  seedItems,
  search,
  saleMethod,
  sort,
}: {
  category: string;
  seedItems: CatalogueCardV2[];
  search: string;
  saleMethod: string;
  sort: string;
}) {
  const [items, setItems] = useState<CatalogueCardV2[]>(seedItems);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [errored, setErrored] = useState(false);
  const loadingRef = useRef(false);
  // Bumped whenever the filters change, so a late in-flight response for a stale
  // filter set is ignored instead of polluting the current row.
  const genRef = useRef(0);

  const params = useMemo(
    () => ({ category, search, saleMethod, sort, limit: 12 }),
    [category, search, saleMethod, sort],
  );

  /** Merge a slice into the row, de-duping by stable listing id (§6). */
  const merge = useCallback((prev: CatalogueCardV2[], next: CatalogueCardV2[]) => {
    const seen = new Set(prev.map((l) => l.id));
    return [...prev, ...next.filter((l) => !seen.has(l.id))];
  }, []);

  const load = useCallback(
    (fromCursor: string | null) => {
      if (loadingRef.current) return;
      const gen = genRef.current;
      loadingRef.current = true;
      setErrored(false);
      fetchCatalogueRow({ ...params, ...(fromCursor ? { cursor: fromCursor } : {}) })
        .then((r) => {
          if (gen !== genRef.current) return;
          // First load replaces the seed with authoritative order; paging merges.
          setItems((prev) => (fromCursor ? merge(prev, r.items) : merge(r.items, prev)));
          setCursor(r.nextCursor);
          setExhausted(r.exhausted);
        })
        .catch(() => {
          // Failure keeps the current items and does NOT mark exhausted (§5).
          if (genRef.current === gen) setErrored(true);
          if (typeof console !== 'undefined') {
            console.warn(`[flow] row "${category}" load failed`, { cursor: fromCursor });
          }
        })
        .finally(() => {
          if (gen === genRef.current) loadingRef.current = false;
        });
    },
    [params, merge, category],
  );

  // Reset to the new seed + load the first slice whenever the filters change.
  useEffect(() => {
    ++genRef.current;
    setItems(seedItems);
    setCursor(null);
    setExhausted(false);
    setErrored(false);
    load(null);
    // `params` is the single trigger; seedItems/load derive from the same filters.
  }, [params, seedItems, load]);

  const loadMore = useCallback(() => {
    if (exhausted || !cursor) return;
    load(cursor);
  }, [exhausted, cursor, load]);

  // A row with zero items AND a confirmed-empty backend simply renders nothing;
  // but if it errored with no items we still show a retry so it never vanishes.
  if (items.length === 0 && !errored) return null;

  return (
    <div>
      <CubeRow<CatalogueCardV2>
        rowId={category}
        title={category}
        subtitle={bandSubtitle(items, exhausted)}
        items={items}
        itemKey={(lot) => lot.id}
        renderItem={(lot) => <SaleCard lot={lot} compact />}
        onNearEnd={loadMore}
      />
      {errored ? (
        <div className="mt-1 flex items-center gap-3 px-1 text-xs text-amber-300/80">
          <span>Couldn’t load more in {category}.</span>
          <button
            type="button"
            onClick={() => load(cursor)}
            className="rounded border border-amber-300/30 px-2 py-0.5 font-medium text-amber-200 hover:bg-amber-300/10"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** "Live 8 · Ending soon 2 · 14 lots" style row summary (doc 04 catalogue mock). */
function bandSubtitle(items: CatalogueCardV2[], exhausted: boolean): string {
  const live = items.filter(
    (l) => l.commercial.kind === 'auction' && l.status.toLowerCase() === 'live',
  ).length;
  const endingSoon = items.filter(
    (l) =>
      l.commercial.kind === 'auction' &&
      l.commercial.endsAt != null &&
      new Date(l.commercial.endsAt).getTime() - Date.now() < 24 * 3_600_000,
  ).length;
  // A trailing "+" signals more slices are loadable via the row cursor.
  const parts = [`${items.length}${exhausted ? '' : '+'} lots`];
  if (live > 0) parts.unshift(`Live ${live}`);
  if (endingSoon > 0) parts.push(`Ending soon ${endingSoon}`);
  return parts.join(' · ');
}

function ListView({ items }: { items: CatalogueCardV2[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
      {items.map((lot, i) => (
        <Link
          key={lot.id}
          href={`/lot/${lot.id}`}
          className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03] ${
            i > 0 ? 'border-t border-white/8' : ''
          }`}
        >
          <div
            className="hud-cut-sm h-12 w-16 shrink-0 bg-gradient-to-br from-coal-700/60 to-coal-900/80"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-sm font-semibold text-bone">{lot.title}</h3>
            <p className="text-xs capitalize text-bone-500">
              {lot.category} · {lot.reference}
            </p>
          </div>
          <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
        </Link>
      ))}
    </div>
  );
}

function Pager({
  data,
  page,
  setPage,
}: {
  data: CatalogueResponse | null;
  page: number;
  setPage: (p: number) => void;
}) {
  if (!data || data.totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        className="rounded-md border border-white/10 px-3 py-1 text-bone-300 disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="text-bone-500">
        Page {data.page} of {data.totalPages}
      </span>
      <button
        disabled={page >= data.totalPages}
        onClick={() => setPage(page + 1)}
        className="rounded-md border border-white/10 px-3 py-1 text-bone-300 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}

/** Small caps wayfinding label that leads each filter row ("Category", "Sale method"). */
function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-0.5 hidden select-none text-[10px] font-semibold uppercase tracking-[0.18em] text-bone-600 sm:inline">
      {children}
    </span>
  );
}

/**
 * Filter pill (category + sale-method). Each carries a category-tinted line-icon and a count
 * badge so the row scans at a glance; the selected chip lights up in its own tint (a soft
 * gradient fill, tinted rim and glow) rather than a flat red, which reads as "professional"
 * and makes the active filter obvious. `tint` is an "r,g,b" string; it defaults to gold for
 * the "All" resets and the sale-method row so categories stay the colourful primary axis.
 */
function FilterChip({
  active,
  onClick,
  children,
  icon,
  tint = '201,162,75',
  count,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  tint?: string;
  count?: number;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={
        active
          ? {
              borderColor: `rgba(${tint},0.55)`,
              backgroundImage: `linear-gradient(160deg, rgba(${tint},0.24), rgba(${tint},0.08))`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px -10px rgba(${tint},0.7)`,
            }
          : undefined
      }
      className={`group inline-flex items-center gap-1.5 rounded-full border font-medium capitalize transition-all duration-200 ${
        small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      } ${
        active
          ? 'text-white'
          : 'border-white/10 bg-white/[0.02] text-bone-300 hover:-translate-y-px hover:border-white/25 hover:bg-white/[0.05] hover:text-bone'
      }`}
    >
      {icon ? (
        <span
          aria-hidden
          className="shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{ color: active ? `rgb(${tint})` : `rgba(${tint},0.72)` }}
        >
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
      {typeof count === 'number' ? (
        <span
          className={`tabular ml-0.5 rounded-full px-1.5 text-[10px] font-semibold leading-4 ${
            active ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-bone-500'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
