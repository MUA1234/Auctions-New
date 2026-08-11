'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Responsive faces-per-page for a Rubik row based on the row's own width
 * (doc 04 "mobile 1 · tablet 2 · desktop 3–4"). Measures the element rather
 * than the window so a row inside a narrow column still lays out sensibly.
 */
export function useFaceCount(ref: RefObject<HTMLElement>, max = 4): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = el.clientWidth;
      const n = w >= 1024 ? 4 : w >= 768 ? 3 : w >= 520 ? 2 : 1;
      setCount(Math.min(n, max));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, max]);

  return count;
}
