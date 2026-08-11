'use client';

import { useEffect, useState } from 'react';

/**
 * True when the viewer has asked the OS to minimise motion. AuctionFlow uses
 * this to fall back from 3D rotation to a non-rotating paged rail (doc 04
 * "Reduced-motion users may default to Grid or non-rotating paged rails").
 * SSR-safe: assumes no reduction until the client confirms.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}
