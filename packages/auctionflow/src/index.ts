import type { ListingId } from '@singha/contracts';

/**
 * AuctionFlow — the Rubik-inspired catalogue and buyer command-centre (pack
 * doc 04). The Rubik is NOT one literal six-sided cube: it is a stack of
 * independent horizontal category/status rows, each an independent 3D-rotating
 * slice. This package holds the reusable primitives so the mechanics are never
 * private inside `CatalogueBrowser.tsx`.
 */
export const VIEW_MODES = ['cube', 'grid', 'list'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = 'grid';

/** Sale-mode-aware summary a catalogue card renders (doc 04 "Sale-aware cards"). */
export interface CatalogueCard {
  listingId: ListingId;
  reference: string;
  title: string;
  location?: string;
  saleMethodBadge: string;
  /** Current bid / guide / fixed price, pre-formatted for display. */
  priceLabel?: string;
  /** Closing/'time left' label, or null for non-timed sale modes. */
  timeLabel?: string | null;
}

/** Cycle Cube -> Grid -> List -> Cube. Used by the catalogue mode toggle. */
export function cycleViewMode(current: ViewMode): ViewMode {
  const index = VIEW_MODES.indexOf(current);
  return VIEW_MODES[(index + 1) % VIEW_MODES.length]!;
}

export function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(value);
}

// --- Pure paging / gesture maths (unit-tested, no React/DOM) ---------------
export {
  pageCount,
  clampPage,
  stepPage,
  faceItems,
  adjacentPages,
  resolveAxis,
  swipeDelta,
  type GestureAxis,
} from './paging';

// --- Hooks -----------------------------------------------------------------
export { useReducedMotion } from './hooks/useReducedMotion';
export { useFaceCount } from './hooks/useFaceCount';
export { useCubeGesture, type CubeGesture, type CubeGestureHandlers } from './hooks/useCubeGesture';
export {
  CubePositionProvider,
  useCubePosition,
  type CubePositionState,
} from './hooks/useCubePosition';

// --- Components (the Rubik primitives) -------------------------------------
export { AuctionFlowViewport } from './components/AuctionFlowViewport';
export { CubeRow, type CubeRowProps } from './components/CubeRow';
export { CubeFace } from './components/CubeFace';
export { CubeControls, CubeProgress } from './components/CubeControls';
