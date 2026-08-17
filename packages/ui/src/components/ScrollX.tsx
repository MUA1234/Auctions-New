'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

export interface ScrollXProps {
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal-scroll container whose scrollbar is hidden but which shows a soft edge-fade on
 * whichever side has off-screen content — a "there's more, scroll →" affordance that appears
 * ONLY when the content actually overflows (never a false hint when everything fits). Measures
 * on scroll and on resize (ResizeObserver), so it adapts to viewport and content changes.
 * Used for the catalogue filter chip rails and the shared DataTable so a clipped last item
 * reads as scrollable, not broken.
 */
export function ScrollX({ children, className }: ScrollXProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [measure]);

  // Fade only the edge(s) with off-screen content; no mask at all when the rail fits.
  const mask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 24px, #000 calc(100% - 24px), ${edges.right ? 'transparent' : '#000'} 100%)`
      : undefined;

  return (
    <div
      ref={ref}
      className={cn('no-scrollbar overflow-x-auto', className)}
      style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
    >
      {children}
    </div>
  );
}
