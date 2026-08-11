'use client';

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { resolveAxis, swipeDelta, type GestureAxis } from '../paging';

export interface CubeGestureHandlers {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
}

export interface CubeGesture {
  /** Live horizontal drag offset in px (0 unless a horizontal drag is active). */
  dragX: number;
  /** Locked axis for the in-flight gesture, or null before the lock resolves. */
  axis: GestureAxis;
  dragging: boolean;
  handlers: CubeGestureHandlers;
}

/**
 * Pointer gesture for a single Rubik row with a hard direction lock (doc 04):
 * once the pointer resolves to VERTICAL intent we release entirely so the page
 * scrolls normally; only HORIZONTAL intent drags/rotates the row. Pair with
 * `touch-action: pan-y` on the element so touch vertical scroll is never
 * hijacked. On release a drag past the commit threshold advances one face.
 */
export function useCubeGesture(faceWidth: number, onCommit: (delta: number) => void): CubeGesture {
  const [dragX, setDragX] = useState(0);
  const [axis, setAxis] = useState<GestureAxis>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const axisRef = useRef<GestureAxis>(null);

  const reset = useCallback(() => {
    start.current = null;
    axisRef.current = null;
    setAxis(null);
    setDragX(0);
    setDragging(false);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (!e.isPrimary) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    axisRef.current = null;
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;

    if (!axisRef.current) {
      const resolved = resolveAxis(dx, dy);
      if (!resolved) return;
      axisRef.current = resolved;
      setAxis(resolved);
      // Vertical intent: hand the gesture back to the page scroller.
      if (resolved === 'vertical') {
        start.current = null;
        setDragging(false);
        return;
      }
      // Horizontal intent: capture the pointer so the drag tracks off-element.
      (e.currentTarget as Element).setPointerCapture?.(s.id);
    }

    if (axisRef.current === 'horizontal') setDragX(dx);
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const s = start.current;
      if (s) (e.currentTarget as Element).releasePointerCapture?.(s.id);
      if (axisRef.current === 'horizontal') {
        const delta = swipeDelta(dragX, faceWidth);
        if (delta !== 0) onCommit(delta);
      }
      reset();
    },
    [dragX, faceWidth, onCommit, reset],
  );

  return {
    dragX,
    axis,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
    },
  };
}
