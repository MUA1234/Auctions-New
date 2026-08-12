'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { adjacentPages, faceItems, pageCount, stepPage, swipeDelta } from '../paging';
import { useCubePosition } from '../hooks/useCubePosition';
import { useCubeGesture } from '../hooks/useCubeGesture';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { CubeFace } from './CubeFace';
import { CubeControls, CubeProgress } from './CubeControls';

export interface CubeRowProps<T> {
  /** Stable id — its face survives realtime item updates and view toggles. */
  rowId: string;
  title: string;
  /** e.g. "Live 18 · Ending soon 4". */
  subtitle?: ReactNode;
  items: readonly T[];
  /** Stable key for an item, used for React keys so a bid update never remounts. */
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Optional cap on faces-per-page (defaults to the responsive 1–10, §7). */
  maxPerFace?: number;
  /**
   * Fired when the visible face reaches the last loaded page — the row's cue to
   * fetch its next cursor slice (pack 01 doc 05: prefetch near the last face).
   * The handler must be idempotent; the row may call it repeatedly at the edge.
   */
  onNearEnd?: () => void;
}

/**
 * Visible lot positions across a Flow row, responsive to viewport (Revision 05
 * §7 / 06.1 §12): a large desktop is an expansive marketplace canvas (~8–10
 * across), a laptop is balanced, a tablet is reduced, mobile is touch-first —
 * without ever shrinking cards into unreadability. Card COUNT and 3D depth are
 * separate concerns (06.1 §12): the geometry never solves leakage by dropping to
 * 3–4 cards.
 */
function facesForWidth(w: number, max: number): number {
  const n =
    w >= 1920
      ? 10
      : w >= 1680
        ? 9
        : w >= 1440
          ? 8
          : w >= 1280
            ? 6
            : w >= 1024
              ? 5
              : w >= 768
                ? 3
                : w >= 520
                  ? 2
                  : 1;
  return Math.min(n, max);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A quarter-turn in flight. `dir` is which neighbour turns in (1 next, -1 prev);
 *  `to` is the animation target — ±1 commits the turn, 0 snaps back (06.1 §10). */
interface Turn {
  dir: 1 | -1;
  to: 1 | -1 | 0;
}

/**
 * One independent Flow row (Revision 06.1). Each row owns its own face position,
 * so rows rotate independently and a realtime bid on one lot never resets any
 * row. The motion is an edge-hinged quarter-turn: the front page pivots away
 * around a vertical hinge while the incoming page pivots in around the same edge,
 * so cards stay at normal scale and nothing leaks past the row (06.1 §4–§6).
 *
 * - `total <= 1` rows are fully STATIC: no 3D, no rotation, no gesture handlers,
 *   controls hidden (06.1 §7).
 * - Horizontal intent turns the row; vertical intent scrolls the page (direction
 *   lock in the gesture hook, §17). A small drag snaps back; a committed swipe
 *   finishes the quarter-turn (§10).
 * - Under prefers-reduced-motion it degrades to a non-rotating paged rail (§15).
 * Backend pagination means the row only ever holds the lots it was given — it
 * pages through ALL of them, not six.
 */
export function CubeRow<T>({
  rowId,
  title,
  subtitle,
  items,
  itemKey,
  renderItem,
  maxPerFace = 10,
  onNearEnd,
}: CubeRowProps<T>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const perFace = facesForWidth(width || 1024, maxPerFace);
  const total = pageCount(items.length, perFace);
  const { page, setPage } = useCubePosition(rowId, total);

  // Prefetch cue: when the visible face reaches the last loaded page, ask the
  // parent for the next cursor slice. Idempotent — the parent guards on
  // loading/exhausted (pack 01 doc 05).
  useEffect(() => {
    if (onNearEnd && total > 0 && page >= total - 1) onNearEnd();
  }, [onNearEnd, page, total]);

  // `anim` is the committed/settling turn; `snap` disables the transition for one
  // frame after we commit the page so the new front face (identical pixels to the
  // incoming face) appears without a reverse spin. `committedRef` makes the
  // transitionend commit fire exactly once even though several faces transition.
  const [anim, setAnim] = useState<Turn | null>(null);
  const [snap, setSnap] = useState(false);
  const committedRef = useRef(false);

  const interactive = !reduced && total > 1;

  // Arrow / keyboard navigation (also the reduced-motion + commit-from-swipe path).
  const navigate = useCallback(
    (delta: number) => {
      if (total <= 1 || delta === 0) return;
      const dir: 1 | -1 = delta > 0 ? 1 : -1;
      if (reduced) {
        setPage(stepPage(page, dir, total));
        return;
      }
      setAnim((a) => {
        if (a) return a;
        committedRef.current = false;
        return { dir, to: dir };
      });
    },
    [total, reduced, page, setPage],
  );

  // Pointer release: turn the reported drag distance into a commit (past the
  // threshold) or a snap-back, using the row's own measured width (§10).
  const endDrag = useCallback(
    (dx: number) => {
      if (total <= 1 || width <= 0) return;
      if (reduced) {
        const delta = swipeDelta(dx, width);
        if (delta !== 0) setPage(stepPage(page, delta, total));
        return;
      }
      setAnim((a) => {
        if (a) return a;
        const delta = swipeDelta(dx, width);
        committedRef.current = false;
        if (delta !== 0) return { dir: delta as 1 | -1, to: delta as 1 | -1 };
        const dir: 1 | -1 = dx < 0 ? 1 : -1;
        return { dir, to: 0 };
      });
    },
    [total, width, reduced, page, setPage],
  );

  const gesture = useCubeGesture(endDrag);

  useEffect(() => {
    if (!snap) return;
    const id = requestAnimationFrame(() => setSnap(false));
    return () => cancelAnimationFrame(id);
  }, [snap]);

  const onStageTransitionEnd = (e: { propertyName?: string }) => {
    if ((e.propertyName && e.propertyName !== 'transform') || !anim || committedRef.current) return;
    committedRef.current = true;
    if (anim.to !== 0) {
      setSnap(true);
      setPage(stepPage(page, anim.dir, total));
    }
    setAnim(null);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate(-1);
    }
  };

  const faceGrid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${perFace}, minmax(0, 1fr))`,
    gap: '1rem',
  };

  function renderFace(faceIndex: number) {
    return (
      <div style={faceGrid}>
        {faceItems(items, faceIndex, perFace).map((item) => (
          <div key={itemKey(item)}>{renderItem(item)}</div>
        ))}
      </div>
    );
  }

  // Live turn state: driven by the settling animation, else by an in-flight drag.
  const dragTurn =
    !anim && gesture.axis === 'horizontal' && width > 0 ? clamp(-gesture.dragX / width, -1, 1) : 0;
  const turnVal = anim ? anim.to : dragTurn;
  const dir: 1 | -1 | 0 = anim ? anim.dir : turnVal > 0 ? 1 : turnVal < 0 ? -1 : 0;
  const m = Math.min(1, Math.abs(turnVal));
  const turning = dir !== 0;

  const transition = anim && !snap ? 'transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
  const originStyle = { transformOrigin: dir < 0 ? '0% 50%' : '100% 50%', transition };

  // Hinge transforms. current folds away around the leading edge; the incoming
  // page unfolds in around the SAME edge; the other neighbour stays folded flat
  // against its own hinge (edge-on, invisible, contained) so it can transition
  // without a mount flash (§9, §11).
  const currentT = `rotateY(${(-dir * 90 * m).toFixed(3)}deg)`;
  const nextT = `rotateY(${(90 * (1 - (dir > 0 ? m : 0))).toFixed(3)}deg)`;
  const prevT = `rotateY(${(-90 * (1 - (dir < 0 ? m : 0))).toFixed(3)}deg)`;

  const { prev, next } = adjacentPages(page, total);

  return (
    <section className="af-row" aria-roledescription="rotating category row">
      <header className="af-row-head">
        <div>
          <h2 className="af-row-title">{title}</h2>
          {subtitle && <p className="af-row-sub">{subtitle}</p>}
        </div>
        <div className="af-row-tools">
          <CubeProgress total={total} current={page} onSelect={setPage} label={title} />
          <CubeControls
            label={title}
            disabled={total <= 1}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
          />
        </div>
      </header>

      <div ref={bodyRef} className="af-row-body">
        {!interactive ? (
          // Static rail: single non-rotating page. Used for reduced-motion AND
          // for one-page rows (§7) — no 3D, no gesture handlers, nothing to leak.
          <div
            className="af-rail"
            tabIndex={0}
            role="group"
            aria-label={`${title} lots`}
            onKeyDown={onKeyDown}
          >
            {renderFace(page)}
          </div>
        ) : (
          <div
            className="af-viewport"
            tabIndex={0}
            role="group"
            aria-label={`${title} lots`}
            onKeyDown={onKeyDown}
            style={{ touchAction: 'pan-y' }}
            {...gesture.handlers}
          >
            <div className="af-stage" onTransitionEnd={onStageTransitionEnd}>
              {turning && (
                <div className="af-seam" aria-hidden data-side={dir < 0 ? 'left' : 'right'} />
              )}
              <CubeFace active style={{ transform: currentT, ...originStyle }}>
                {renderFace(page)}
              </CubeFace>
              <CubeFace
                active={false}
                style={{ transform: nextT, transformOrigin: '100% 50%', transition }}
              >
                {renderFace(next)}
              </CubeFace>
              <CubeFace
                active={false}
                style={{ transform: prevT, transformOrigin: '0% 50%', transition }}
              >
                {renderFace(prev)}
              </CubeFace>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
