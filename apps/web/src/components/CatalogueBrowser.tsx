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

type ViewMode = 'rubik' | 'grid' | 'list';
const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'rubik', label: 'Rubik' },
  { id: 'grid', label: 'Grid' },
  { id: 'list', label: 'List' },
];
const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'ending', label: 'Ending soon' },
  { id: 'price_desc', label: 'Price high→low' },
  { id: 'price_asc', label: 'Price low→high' },
];

/**
 * AuctionFlow catalogue (consolidated pack doc 04). The default "Rubik" view is
 * independent horizontal category BANDS (not a literal cube). All filtering,
 * search and pagination happen SERVER-SIDE via /api/v2/catalogue — we never
 * download all inventory and filter in React. Filter/search state persists
 * across view switches.
 */
export function CatalogueBrowser({
  initialCategory = '',
  initialSaleMethod = '',
}: {
  initialCategory?: string;
  initialSaleMethod?: string;
} = {}) {
  const [view, setView] = useState<ViewMode>('rubik');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string>(initialCategory);
  const [saleMethod, setSaleMethod] = useState<string>(initialSaleMethod);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CatalogueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // In Rubik mode we pull a larger page to fill the category bands.
  const limit = view === 'rubik' ? 60 : 24;

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
  }, [debounced, category, saleMethod, sort, page, limit]);

  // Reset to page 1 whenever filters change.
  useEffect(() => setPage(1), [debounced, category, saleMethod, sort]);

  // Rubik bands are driven by the category facet (all categories), each loading
  // its own cursor slice — not the first global page. A selected category filter
  // narrows to that single band.
  const rubikCategories = useMemo(() => {
    if (category) return [category];
    return (data?.facets.category ?? []).map((f) => f.value);
  }, [category, data]);

  return (
    <div className="mt-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={category === ''} onClick={() => setCategory('')}>
            All
          </FilterChip>
          {(data?.facets.category ?? []).map((f) => (
            <FilterChip
              key={f.value}
              active={category === f.value}
              onClick={() => setCategory(f.value)}
            >
              {f.value} <span className="text-bone-600">({f.count})</span>
            </FilterChip>
          ))}
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
        <FilterChip active={saleMethod === ''} onClick={() => setSaleMethod('')} small>
          All methods
        </FilterChip>
        {(data?.facets.saleMethod ?? []).map((f) => (
          <FilterChip
            key={f.value}
            active={saleMethod === f.value}
            onClick={() => setSaleMethod(f.value)}
            small
          >
            {f.value.replace(/_/g, ' ').toLowerCase()}{' '}
            <span className="text-bone-600">({f.count})</span>
          </FilterChip>
        ))}
      </div>

      <p className="mt-4 text-xs text-bone-500">
        {loading ? 'Loading…' : error ? error : `${data?.total ?? 0} lots`}
      </p>

      {!loading && data && data.items.length === 0 ? (
        <Card className="mt-4">
          <p className="text-bone-400">No lots match your filters.</p>
        </Card>
      ) : view === 'rubik' ? (
        <RubikBands
          categories={rubikCategories}
          search={debounced}
          saleMethod={saleMethod}
          sort={sort}
        />
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
 * Rubik = a stack of INDEPENDENT 3D-rotating category rows (pack doc 04) — not a
 * literal six-sided cube, and not a single rail that rotates every category
 * together. Each row is a `CubeRow` from `@singha/auctionflow` keyed by a stable
 * category id, so rotating one row never touches another and a realtime bid
 * never resets a row. Horizontal drag/arrow/keys rotate a row; vertical intent
 * still scrolls the page normally (direction lock lives in the package).
 */
function RubikBands({
  categories,
  search,
  saleMethod,
  sort,
}: {
  categories: string[];
  search: string;
  saleMethod: string;
  sort: string;
}) {
  return (
    <AuctionFlowViewport>
      <div className="mt-6 text-bone">
        {categories.map((category) => (
          <CategoryBand
            key={category}
            category={category}
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
 * One Rubik row that owns its OWN cursor (pack 01 doc 05). It fetches its first
 * slice on mount / filter change, appends the next slice when the user rotates
 * near the last face (`onNearEnd`), and stops at `exhausted`. Appending never
 * resets the visible face because CubeRow keys position by rowId. This is what
 * makes every category item reachable instead of only the first global page.
 */
function CategoryBand({
  category,
  search,
  saleMethod,
  sort,
}: {
  category: string;
  search: string;
  saleMethod: string;
  sort: string;
}) {
  const [items, setItems] = useState<CatalogueCardV2[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const loadingRef = useRef(false);
  // Bumped whenever the filters change, so a late in-flight response for a stale
  // filter set is ignored instead of polluting the current row.
  const genRef = useRef(0);

  const params = useMemo(
    () => ({ category, search, saleMethod, sort, limit: 12 }),
    [category, search, saleMethod, sort],
  );

  // Reset + load the first slice on mount and whenever the filters change.
  useEffect(() => {
    const gen = ++genRef.current;
    setItems([]);
    setCursor(null);
    setExhausted(false);
    loadingRef.current = true;
    fetchCatalogueRow(params)
      .then((r) => {
        if (gen !== genRef.current) return;
        setItems(r.items);
        setCursor(r.nextCursor);
        setExhausted(r.exhausted);
      })
      .catch(() => genRef.current === gen && setExhausted(true))
      .finally(() => {
        if (gen === genRef.current) loadingRef.current = false;
      });
  }, [params]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || exhausted || !cursor) return;
    const gen = genRef.current;
    loadingRef.current = true;
    fetchCatalogueRow({ ...params, cursor })
      .then((r) => {
        if (gen !== genRef.current) return;
        setItems((prev) => [...prev, ...r.items]);
        setCursor(r.nextCursor);
        setExhausted(r.exhausted);
      })
      .catch(() => genRef.current === gen && setExhausted(true))
      .finally(() => {
        if (gen === genRef.current) loadingRef.current = false;
      });
  }, [params, cursor, exhausted]);

  if (items.length === 0) return null;

  return (
    <CubeRow<CatalogueCardV2>
      rowId={category}
      title={category}
      subtitle={bandSubtitle(items, exhausted)}
      items={items}
      itemKey={(lot) => lot.id}
      renderItem={(lot) => <SaleCard lot={lot} compact />}
      onNearEnd={loadMore}
    />
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

function FilterChip({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border ${small ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'} font-medium capitalize transition-colors ${
        active
          ? 'border-red-500/50 bg-red-500/10 text-bone'
          : 'border-white/10 text-bone-400 hover:border-white/20'
      }`}
    >
      {children}
    </button>
  );
}
