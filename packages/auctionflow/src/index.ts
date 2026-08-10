import type { ListingId } from '@singha/contracts';

/**
 * AuctionFlow — the Rubik-inspired Cube / Grid / List catalogue and buyer
 * command-centre (docs/13). Phase 0 defines the shared VIEW MODEL and pure
 * helpers; the 3D Cube (DOM/CSS transforms, no required WebGL) and the buyer
 * dashboard are built in Phase 4. Selection persists and search/filter state is
 * preserved across mode switches.
 */
export const VIEW_MODES = ['cube', 'grid', 'list'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = 'grid';

/** Sale-mode-aware summary a catalogue card renders (docs/13 "Cards"). */
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
