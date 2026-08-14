'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { type MatrixLayout, matrixLayout } from '../matrix';

/**
 * Responsive {columns, rows} for the V3 Flow matrix, measured from the element's
 * own width (so a band inside a narrow column still lays out correctly). Mirrors
 * `useFaceCount` but returns the full 2-D layout.
 */
export function useMatrixLayout(ref: RefObject<HTMLElement>): MatrixLayout {
  const [layout, setLayout] = useState<MatrixLayout>({ columns: 4, rows: 4 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setLayout(matrixLayout(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return layout;
}
