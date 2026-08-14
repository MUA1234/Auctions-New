/**
 * V3 Infinite Flow Canvas — pure matrix maths (pack doc 08). A Flow band is no
 * longer a single horizontal row: each horizontal "page" (face) is a 2-D matrix
 * of `columns × rows` lot cells. Horizontal movement pages the whole matrix; the
 * page/slice maths reuses the tested primitives in `paging.ts` with a page size of
 * `columns × rows`. Kept free of React/DOM so it is unit-testable in node.
 */

export interface MatrixLayout {
  columns: number;
  rows: number;
}

/**
 * Responsive matrix layout for the Flow canvas at a given element width.
 *
 * Desktop is a dense multi-row band page; phones use the V3 compact target of
 * **4 columns × 4 rows = 16 lots** at 390–430px so the focused canvas shows many
 * assets at once rather than one shrunken desktop card.
 */
export function matrixLayout(width: number): MatrixLayout {
  if (width >= 1920) return { columns: 9, rows: 2 };
  if (width >= 1680) return { columns: 8, rows: 2 };
  if (width >= 1440) return { columns: 7, rows: 2 };
  if (width >= 1280) return { columns: 6, rows: 2 };
  if (width >= 1024) return { columns: 5, rows: 2 };
  if (width >= 768) return { columns: 4, rows: 3 }; // tablet
  // Phones — the 4×4≈16 target. Threshold 340 (not 390) so a 390–430px viewport
  // still hits 4 columns once ~16–24px of page padding is subtracted from the
  // measured canvas element.
  if (width >= 340) return { columns: 4, rows: 4 };
  return { columns: 3, rows: 4 }; // very small
}

/** Cells per horizontal matrix page (= faces' page size for `paging.ts`). */
export function matrixPageSize(layout: MatrixLayout): number {
  return Math.max(1, layout.columns * layout.rows);
}

/**
 * Category-overlay visibility state machine (pack doc 08). The floating band label
 * appears on entering a band and fades once the user resumes scrolling; it may
 * reappear on a deliberate pause. Pure so the transitions are unit-testable; the
 * component owns the CSS fade + timers.
 */
export type OverlayEvent = 'bandEnter' | 'scroll' | 'pause';
export type OverlayState = 'hidden' | 'visible';

export function overlayReducer(state: OverlayState, event: OverlayEvent): OverlayState {
  switch (event) {
    case 'bandEnter':
      return 'visible';
    case 'pause':
      return 'visible';
    case 'scroll':
      return 'hidden';
    default:
      return state;
  }
}
