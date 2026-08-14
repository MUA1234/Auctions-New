'use client';

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

export type SheetSide = 'right' | 'left' | 'bottom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (screen readers). */
  label: string;
  side?: SheetSide;
  children: ReactNode;
  className?: string;
}

const EXIT_MS = 240;

const hidden: Record<SheetSide, string> = {
  right: 'translate-x-full',
  left: '-translate-x-full',
  bottom: 'translate-y-full',
};

const anchor: Record<SheetSide, string> = {
  right: 'inset-y-0 right-0 h-full w-[86%] max-w-sm border-l',
  left: 'inset-y-0 left-0 h-full w-[86%] max-w-sm border-r',
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] w-full border-t rounded-t-3xl',
};

/**
 * Focus-trapped slide-in panel (the design system's single overlay primitive).
 * Used for the mobile navigation drawer and compact filter surfaces. It portals
 * to <body>, locks background scroll, closes on ESC / scrim click, restores focus
 * on close, and honours prefers-reduced-motion via the global CSS reduced-motion
 * block (the transform transition simply collapses to an instant state).
 */
export function Sheet({ open, onClose, label, side = 'right', children, className }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);
  const titleId = useId();

  // Mount → next frame reveal; unmount after the exit transition.
  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement;
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Background scroll lock while open.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // Move focus into the panel on open; restore it on close.
  useEffect(() => {
    if (!shown) return;
    panelRef.current?.focus();
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [shown]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]" aria-hidden={!open}>
      {/* Scrim */}
      <div
        className={cn(
          'absolute inset-0 bg-coal-950/80 backdrop-blur-sm transition-opacity duration-200',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'absolute border-white/[0.08] bg-gradient-to-b from-coal-850 to-coal-950 shadow-card-lg outline-none',
          'transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          anchor[side],
          shown ? 'translate-x-0 translate-y-0' : hidden[side],
          className,
        )}
      >
        <span id={titleId} className="sr-only">
          {label}
        </span>
        {children}
      </div>
    </div>,
    document.body,
  );
}
