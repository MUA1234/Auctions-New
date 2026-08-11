'use client';

import type { ReactNode } from 'react';
import { CubePositionProvider } from '../hooks/useCubePosition';

/** Self-contained styles for the Rubik primitives (theme-neutral, dark-first). */
const CSS = `
.af-viewport{position:relative;perspective:1400px;outline:none;user-select:none;-webkit-user-select:none}
.af-viewport:focus-visible{box-shadow:0 0 0 2px rgba(230,57,70,.5);border-radius:12px}
.af-rail:focus-visible{box-shadow:0 0 0 2px rgba(230,57,70,.5);border-radius:12px;outline:none}
.af-stage{position:relative;transform-style:preserve-3d;will-change:transform}
.af-face{position:absolute;top:0;left:0;width:100%;backface-visibility:hidden}
.af-face[data-active="true"]{position:relative}
.af-side{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,12,.9),rgba(20,22,28,.7));border-radius:12px}
.af-row{margin-bottom:2.5rem}
.af-row-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.9rem}
.af-row-title{font-size:1.25rem;font-weight:700;text-transform:capitalize;letter-spacing:-.01em}
.af-row-sub{font-size:.75rem;opacity:.6;margin-top:2px}
.af-row-tools{display:flex;align-items:center;gap:.75rem}
.af-controls{display:flex;gap:.4rem}
.af-arrow{width:2rem;height:2rem;border-radius:9999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:inherit;font-size:.7rem;line-height:1;cursor:pointer;transition:border-color .15s,background .15s}
.af-arrow:hover:not(:disabled){border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.07)}
.af-arrow:disabled{opacity:.3;cursor:default}
.af-progress{display:flex;align-items:center;gap:.3rem}
.af-dot{width:.45rem;height:.45rem;border-radius:9999px;border:none;padding:0;background:rgba(255,255,255,.22);cursor:pointer;transition:background .15s,width .15s}
.af-dot-on{width:1.1rem;border-radius:9999px;background:rgba(212,175,55,.9)}
@media (prefers-reduced-motion: reduce){.af-stage{transition:none !important}}
`;

/**
 * Root of an AuctionFlow Rubik surface. It owns the per-row face positions
 * (so they survive Grid⇄Rubik toggles and realtime updates) and injects the
 * primitives' styles once. Wrap any set of `CubeRow`s in it.
 */
export function AuctionFlowViewport({ children }: { children: ReactNode }) {
  return (
    <CubePositionProvider>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {children}
    </CubePositionProvider>
  );
}
