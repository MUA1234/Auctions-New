'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { adjacentPages, faceItems, pageCount, stepPage } from '../paging';
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
  /** Optional cap on faces-per-page (defaults to the responsive 1–4). */
  maxPerFace?: number;
  /**
   * Fired when the visible face reaches the last loaded page — the row's cue to
   * fetch its next cursor slice (pack 01 doc 05: prefetch near the last face).
   * The handler must be idempotent; the row may call it repeatedly at the edge.
   */
  onNearEnd?: () => void;
}

function facesForWidth(w: number, max: number): number {
  const n = w >= 1024 ? 4 : w >= 768 ? 3 : w >= 520 ? 2 : 1;
  return Math.min(n, max);
}

/**
 * One independent, 3D-rotating slice of the AuctionFlow Rubik (doc 04). Each row
 * owns its own face position, so rows rotate independently and a realtime bid on
 * one lot never resets any row. Horizontal intent rotates the row; vertical
 * intent scrolls the page (direction lock). Under prefers-reduced-motion it
 * degrades to a non-rotating paged rail. Backend pagination means the row only
 * ever holds the lots it was given — it pages through ALL of them, not six.
 */
export function CubeRow<T>({
  rowId,
  title,
  subtitle,
  items,
  itemKey,
  renderItem,
  maxPerFace = 4,
  onNearEnd,
}: CubeRowProps<T>) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = stageRef.current;
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

  // Rotation animation: `anim.dir` is the in-flight direction; `snap` disables
  // the transition for one frame after we commit the page so the new front face
  // (identical pixels to the incoming face) shows without a jump.
  const [anim, setAnim] = useState<{ dir: 1 | -1 } | null>(null);
  const [snap, setSnap] = useState(false);

  const navigate = useCallback(
    (delta: number) => {
      if (total <= 1 || delta === 0) return;
      const dir: 1 | -1 = delta > 0 ? 1 : -1;
      if (reduced) {
        setPage(stepPage(page, dir, total));
        return;
      }
      setAnim((a) => a ?? { dir });
    },
    [total, reduced, page, setPage],
  );

  const gesture = useCubeGesture(width, navigate);

  useEffect(() => {
    if (!snap) return;
    const id = requestAnimationFrame(() => setSnap(false));
    return () => cancelAnimationFrame(id);
  }, [snap]);

  const onTransitionEnd = () => {
    if (!anim) return;
    setSnap(true);
    setPage(stepPage(page, anim.dir, total));
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

  const { prev, next } = adjacentPages(page, total);
  const r = (width || 0) / 2;

  // Live stage angle: driven by the animation, else by an in-flight drag.
  let angle = 0;
  if (anim) angle = anim.dir === 1 ? -90 : 90;
  else if (gesture.axis === 'horizontal' && width > 0)
    angle = Math.max(-90, Math.min(90, (-gesture.dragX / width) * 90));

  const transition = anim && !snap ? 'transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';

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

      {reduced ? (
        // Reduced-motion fallback: a non-rotating paged rail, no 3D transforms.
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
          ref={stageRef}
          className="af-viewport"
          tabIndex={0}
          role="group"
          aria-label={`${title} lots`}
          onKeyDown={onKeyDown}
          style={{ touchAction: 'pan-y' }}
          {...gesture.handlers}
        >
          <div
            className="af-stage"
            style={{ transform: `rotateY(${angle}deg)`, transition }}
            onTransitionEnd={onTransitionEnd}
          >
            {/* Dark inner side surface exposed at the seam during rotation. */}
            <div className="af-side" aria-hidden style={{ transform: `translateZ(${-r}px)` }} />
            <CubeFace active style={{ transform: `rotateY(0deg) translateZ(${r}px)` }}>
              {renderFace(page)}
            </CubeFace>
            <CubeFace active={false} style={{ transform: `rotateY(90deg) translateZ(${r}px)` }}>
              {renderFace(next)}
            </CubeFace>
            <CubeFace active={false} style={{ transform: `rotateY(-90deg) translateZ(${r}px)` }}>
              {renderFace(prev)}
            </CubeFace>
          </div>
        </div>
      )}
    </section>
  );
}
