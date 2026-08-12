'use client';

import type { ReactNode } from 'react';
import { CubePositionProvider } from '../hooks/useCubePosition';

/**
 * Self-contained styles for the Flow primitives (theme-neutral, dark-first).
 *
 * Geometry (Revision 06.1): each row is an edge-hinged two-face quarter-turn, NOT
 * a literal full-width cube. The viewport owns a bounded `perspective` and clips
 * its own 3D scene locally (`overflow:clip`) so side/incoming faces can never leak
 * into the page margin, a neighbouring section or the browser edge — containment
 * lives in the component, never in global body overflow. Faces pivot around a
 * vertical hinge edge, so they stay inside the row width at normal card scale.
 */
const CSS = `
.af-viewport{position:relative;overflow:clip;perspective:1600px;perspective-origin:50% 50%;border-radius:14px;outline:none;user-select:none;-webkit-user-select:none}
.af-viewport:focus-visible{box-shadow:0 0 0 2px rgba(230,57,70,.5)}
.af-rail:focus-visible{box-shadow:0 0 0 2px rgba(230,57,70,.5);border-radius:14px;outline:none}
.af-stage{position:relative;transform-style:preserve-3d}
.af-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:transform}
.af-face[data-active="true"]{position:relative}
/* Narrow dark inner seam revealed at the hinge during a turn — a thin bounded
   side surface, never a full duplicate lot page edge-on at the page margin. */
.af-seam{position:absolute;top:0;bottom:0;width:26px;pointer-events:none;background:linear-gradient(90deg,rgba(6,7,10,0),rgba(6,7,10,.85))}
.af-seam[data-side="right"]{right:0;transform-origin:100% 50%;transform:rotateY(-90deg)}
.af-seam[data-side="left"]{left:0;transform-origin:0% 50%;transform:rotateY(90deg);background:linear-gradient(270deg,rgba(6,7,10,0),rgba(6,7,10,.85))}
.af-row{margin-bottom:2.5rem}
.af-row-body{position:relative}
.af-row-head{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem 1rem;margin-bottom:.9rem;flex-wrap:wrap}
.af-row-title{font-size:1.25rem;font-weight:700;text-transform:capitalize;letter-spacing:-.01em;min-width:0}
.af-row-sub{font-size:.75rem;opacity:.6;margin-top:2px}
.af-row-tools{display:flex;align-items:center;gap:.75rem;flex-shrink:0;margin-left:auto}
.af-count{font-size:.72rem;font-variant-numeric:tabular-nums;color:rgba(212,175,55,.9);white-space:nowrap}
.af-controls{display:flex;gap:.4rem}
.af-arrow{width:2rem;height:2rem;border-radius:9999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:inherit;font-size:.7rem;line-height:1;cursor:pointer;transition:border-color .15s,background .15s}
.af-arrow:hover:not(:disabled){border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.07)}
.af-arrow:disabled{opacity:.3;cursor:default}
.af-progress{display:flex;align-items:center;gap:.3rem}
.af-dot{width:.45rem;height:.45rem;border-radius:9999px;border:none;padding:0;background:rgba(255,255,255,.22);cursor:pointer;transition:background .15s,width .15s}
.af-dot-on{width:1.1rem;border-radius:9999px;background:rgba(212,175,55,.9)}
@media (prefers-reduced-motion: reduce){.af-face{transition:none !important}}
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
