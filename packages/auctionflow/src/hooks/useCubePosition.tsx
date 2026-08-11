'use client';

import { createContext, createElement, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { clampPage } from '../paging';

/** Face index per stable row id (doc 04 "Track by stable row ID"). */
export type CubePositionState = Record<string, number>;

interface CubeStore {
  get(rowId: string): number;
  set(rowId: string, page: number): void;
}

const CubeStoreContext = createContext<CubeStore | null>(null);

/**
 * Holds the current face of every row keyed by a stable id, ABOVE the rows
 * themselves. Because it lives in the viewport, a row's position survives
 * realtime item updates and even a Grid⇄Rubik toggle — it never resets when a
 * bid changes (doc 04 "Realtime bid changes must not reset the row").
 */
export function CubePositionProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<CubePositionState>({});
  const ref = useRef(positions);
  ref.current = positions;

  const store = useMemo<CubeStore>(
    () => ({
      get: (rowId) => ref.current[rowId] ?? 0,
      set: (rowId, page) => setPositions((prev) => ({ ...prev, [rowId]: page })),
    }),
    [],
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

  const raw = store ? store.get(rowId) : local;
  const page = clampPage(raw, pageCount);

  const setPage = (next: number) => {
    const clamped = clampPage(next, pageCount);
    if (store) store.set(rowId, clamped);
    else setLocal(clamped);
  };

  return { page, setPage };
}
