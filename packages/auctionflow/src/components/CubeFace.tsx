'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * One face of a Rubik row. When it is not the active face it is made `inert` +
 * `aria-hidden`, so its cards never receive keyboard focus or screen-reader
 * attention while off-screen (doc 04 reject "offscreen faces remain
 * keyboard-focusable"). `inert` is toggled imperatively to stay compatible with
 * React 18, which does not yet type the attribute.
 */
export function CubeFace({
  active,
  style,
  children,
}: {
  active: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [active]);

  return (
    <div
      ref={ref}
      className="af-face"
      style={style}
      aria-hidden={active ? undefined : true}
      data-active={active ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}
