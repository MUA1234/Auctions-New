'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, Chip } from '@singha/ui';
import { fetchCatalogueV2, type CatalogueCardV2, type CatalogueResponse } from '../lib/api';
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
export function CatalogueBrowser() {
  const [view, setView] = useState<ViewMode>('rubik');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string>('');
  const [saleMethod, setSaleMethod] = useState<string>('');
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

  const bands = useMemo(() => groupByCategory(data?.items ?? []), [data]);

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
        <RubikBands bands={bands} />
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

/** Rubik = one independent, horizontally-scrolling band per category. */
function RubikBands({ bands }: { bands: { category: string; items: CatalogueCardV2[] }[] }) {
  return (
    <div className="mt-6 flex flex-col gap-10">
      {bands.map((band) => (
        <section key={band.category}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold capitalize text-bone">{band.category}</h2>
            <span className="text-xs text-bone-500">{band.items.length} lots</span>
          </div>
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
            {band.items.map((lot) => (
              <div key={lot.id} className="w-64 shrink-0 snap-start">
                <SaleCard lot={lot} compact />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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

function groupByCategory(
  items: CatalogueCardV2[],
): { category: string; items: CatalogueCardV2[] }[] {
  const map = new Map<string, CatalogueCardV2[]>();
  for (const item of items) {
    const arr = map.get(item.category) ?? [];
    arr.push(item);
    map.set(item.category, arr);
  }
  return [...map.entries()]
    .map(([category, list]) => ({ category, items: list }))
    .sort((a, b) => b.items.length - a.items.length);
}
