'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, Chip } from '@singha/ui';
import { VIEW_MODES, type ViewMode } from '@singha/auctionflow';
import type { CatalogueLot } from '../lib/api';
import { formatMoney, timeLeft } from '../lib/format';

/**
 * AuctionFlow catalogue (docs/13, rule 14): Cube / Grid / List with search +
 * category filter. Filter/search/selection state is preserved across mode
 * switches (it lives here, above the view). The Cube uses DOM/CSS 3D transforms
 * — no WebGL required.
 */
export function CatalogueBrowser({ lots }: { lots: CatalogueLot[] }) {
  const [mode, setMode] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(lots.map((l) => l.category))).sort()],
    [lots],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lots.filter((l) => {
      if (category !== 'all' && l.category !== category) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.reference.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    });
  }, [lots, query, category]);

  return (
    <div className="mt-8">
      {/* Controls — persist across mode switches */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                category === c
                  ? 'border-red-500/50 bg-red-500/10 text-bone'
                  : 'border-white/10 text-bone-400 hover:border-white/20'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lots…"
            className="w-44 rounded-md border border-white/10 bg-coal-900/60 px-3 py-1.5 text-sm text-bone placeholder:text-bone-600 focus:border-red-500/40 focus:outline-none"
          />
          <div className="flex overflow-hidden rounded-md border border-white/10">
            {VIEW_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  mode === m ? 'bg-red-500/15 text-bone' : 'text-bone-400 hover:text-bone-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-bone-500">
        {filtered.length} {filtered.length === 1 ? 'lot' : 'lots'}
      </p>

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <p className="text-bone-400">No lots match your search.</p>
        </Card>
      ) : mode === 'grid' ? (
        <GridView lots={filtered} />
      ) : mode === 'list' ? (
        <ListView lots={filtered} />
      ) : (
        <CubeView lots={filtered} />
      )}
    </div>
  );
}

function GridView({ lots }: { lots: CatalogueLot[] }) {
  return (
    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {lots.map((lot) => (
        <Link key={lot.id} href={`/lot/${lot.id}`}>
          <Card className="flex h-full flex-col gap-3 transition-colors hover:border-red-500/30">
            <div className="flex items-center justify-between">
              <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
              <span className="text-xs text-bone-500">{lot.reference}</span>
            </div>
            <div
              className="hud-cut-sm aspect-[4/3] w-full bg-gradient-to-br from-coal-700/60 to-coal-900/80"
              aria-hidden
            />
            <h3 className="font-display text-base font-semibold text-bone">{lot.title}</h3>
            <p className="text-xs capitalize text-bone-500">{lot.category}</p>
            <div className="mt-auto flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-bone-500">Current bid</p>
                <span className="tabular font-display text-lg font-bold text-gold-400">
                  {formatMoney(lot.currentBidMinor, lot.currency)}
                </span>
              </div>
              <span className="text-xs text-bone-400">{timeLeft(lot.endsAt)}</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ListView({ lots }: { lots: CatalogueLot[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
      {lots.map((lot, i) => (
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
          <div className="w-32 text-right">
            <span className="tabular font-display text-sm font-bold text-gold-400">
              {formatMoney(lot.currentBidMinor, lot.currency)}
            </span>
            <p className="text-[11px] text-bone-500">{timeLeft(lot.endsAt)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * The Rubik-inspired Cube: lots are laid out on the six faces of a rotating 3D
 * cube (CSS transforms). Arrows rotate the cube; each face paginates through the
 * filtered lots six at a time.
 */
function CubeView({ lots }: { lots: CatalogueLot[] }) {
  const [rotX, setRotX] = useState(-18);
  const [rotY, setRotY] = useState(24);
  const faces = lots.slice(0, 6);
  const facePositions = [
    'rotateY(0deg)',
    'rotateY(90deg)',
    'rotateY(180deg)',
    'rotateY(-90deg)',
    'rotateX(90deg)',
    'rotateX(-90deg)',
  ];

  return (
    <div className="mt-5">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setRotY((y) => y - 90)}
          className="rounded-md border border-white/10 px-3 py-1 text-sm text-bone-300 hover:border-white/20"
          aria-label="Rotate left"
        >
          ←
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRotX((x) => x - 90)}
            className="rounded-md border border-white/10 px-3 py-1 text-sm text-bone-300 hover:border-white/20"
            aria-label="Rotate up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => setRotX((x) => x + 90)}
            className="rounded-md border border-white/10 px-3 py-1 text-sm text-bone-300 hover:border-white/20"
            aria-label="Rotate down"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          onClick={() => setRotY((y) => y + 90)}
          className="rounded-md border border-white/10 px-3 py-1 text-sm text-bone-300 hover:border-white/20"
          aria-label="Rotate right"
        >
          →
        </button>
      </div>

      <div className="flex justify-center py-10" style={{ perspective: '1100px' }}>
        <div
          className="relative"
          style={{
            width: 240,
            height: 240,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transition: 'transform 500ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {facePositions.map((transform, i) => {
            const lot = faces[i];
            return (
              <div
                key={i}
                className="absolute inset-0 flex flex-col justify-between rounded-lg border border-red-500/25 bg-coal-900/85 p-4 backdrop-blur-sm"
                style={{ transform: `${transform} translateZ(120px)` }}
              >
                {lot ? (
                  <Link href={`/lot/${lot.id}`} className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
                    </div>
                    <div>
                      <h3 className="line-clamp-2 font-display text-sm font-semibold text-bone">
                        {lot.title}
                      </h3>
                      <p className="mt-1 text-xs capitalize text-bone-500">{lot.category}</p>
                      <span className="tabular mt-2 block font-display text-base font-bold text-gold-400">
                        {formatMoney(lot.currentBidMinor, lot.currency)}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-xs text-bone-600">Singha</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-center text-xs text-bone-600">
        Showing the first {faces.length} of {lots.length} lots on the cube — use Grid or List for
        all.
      </p>
    </div>
  );
}
