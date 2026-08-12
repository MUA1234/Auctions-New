'use client';

import { createContext, createElement, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clampPage } from '../paging';

/** Face index per stable row id (doc 04 "Track by stable row ID"). */
export type CubePositionState = Record<string, number>;

interface CubeStore {
  positions: CubePositionState;
  set(rowId: string, page: number): void;
}

const CubeStoreContext = createContext<CubeStore | null>(null);

/**
 * Holds the current face of every row keyed by a stable id, ABOVE the rows
 * themselves. Because it lives in the viewport, a row's position survives
 * realtime item updates and even a Grid⇄Flow toggle — it never resets when a
 * bid changes (doc 04 "Realtime bid changes must not reset the row").
 *
 * The context value is the positions map itself (memoised on `positions`), so a
 * position change changes the value reference and consumers actually re-render.
 * (A stable memoised store with a mutable ref would only update rows that happen
 * to re-render for another reason — which silently broke paging that isn't tied
 * to the rotation animation, e.g. reduced-motion arrows and the page dots.)
 */
export function CubePositionProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<CubePositionState>({});

  const store = useMemo<CubeStore>(
    () => ({
      positions,
      set: (rowId, page) =>
        setPositions((prev) => (prev[rowId] === page ? prev : { ...prev, [rowId]: page })),
    }),
    [positions],
  );

  return createElement(CubeStoreContext.Provider, { value: store }, children);
}

/**
 * Read/advance one row's face. Clamps to the live page count so a row that
 * shrinks (items sold/removed) can never point past its last face. Falls back
 * to component-local state when used outside a provider, so a lone CubeRow still
 * works.
 */
export function useCubePosition(
  rowId: string,
  pageCount: number,
): { page: number; setPage: (page: number) => void } {
  const store = useContext(CubeStoreContext);
  const [local, setLocal] = useState(0);

  const raw = store ? (store.positions[rowId] ?? 0) : local;
  const page = clampPage(raw, pageCount);

  const setPage = (next: number) => {
    const clamped = clampPage(next, pageCount);
    if (store) store.set(rowId, clamped);
    else setLocal(clamped);
  };

  return { page, setPage };
}
