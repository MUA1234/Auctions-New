'use client';

import { useEffect, type RefObject } from 'react';

/**
 * usePointerAtmosphere — desktop-only, fine-pointer-only micro-parallax for the Living
 * Background's decorative light layers. It reads POINTER coordinates only and lerps them
 * into the `--lb-px` / `--lb-py` CSS variables (range roughly -1..1) on the given root
 * element; the CSS module maps those to a few px of translation on the ambient group.
 *
 * It never reads scrollY, scroll progress, IntersectionObserver, or any scroll library —
 * per the Living Background pack, background motion must be independent of scrolling.
 * Disabled under coarse pointers, reduced-motion, or when `enabled` is false.
 */
export function usePointerAtmosphere(rootRef: RefObject<HTMLElement>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const el = rootRef.current;
    if (!el || typeof window === 'undefined' || !window.matchMedia) return;

    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let alive = true;

    function onMove(e: PointerEvent) {
      // Normalise to -1..1 around the viewport centre.
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    }

    function loop() {
      if (!alive) return;
      // Smooth (lerp) toward the pointer target — no direct 1:1 tracking.
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      const node = rootRef.current;
      if (node) {
        node.style.setProperty('--lb-px', curX.toFixed(3));
        node.style.setProperty('--lb-py', curY.toFixed(3));
      }
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [rootRef, enabled]);
}
