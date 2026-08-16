'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Optional page/item context a surface can seed the assistant with when it opens the chat. */
export interface AssistantSeed {
  /** The listing the customer was looking at — attached to the next message as customer-safe
   *  server-assembled item context (never raw listing facts from the browser). */
  listingId?: string;
  /** The page URL the customer was on, for context only. */
  url?: string;
}

export interface AssistantContextValue {
  /** Whether the launcher/panel is gated open. */
  open: boolean;
  /** The seed the panel was last opened with (`{}` for a general, unseeded open). */
  seed: AssistantSeed;
  /** Open the assistant panel, optionally pre-seeded with a listing/page context. Calling this
   *  again while already open re-seeds the context (e.g. tapping "Ask Singha AI" on a second
   *  lot mid-conversation) without losing the running conversation. */
  openAssistant: (seed?: AssistantSeed) => void;
  close: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

/**
 * Shared "Singha Assistant" open/closed + seed state (AIC-5). Mounted once in the root layout
 * (`<AssistantProvider><SinghaAssistant /></AssistantProvider>`) alongside every other surface,
 * so any component anywhere in the tree — the lot detail page, a `SaleCard`, a future RFQ page —
 * can pop the SAME chat panel open, optionally pointed at a specific listing, via `useAssistant()`.
 * Holds only UI-open state and the seed; the actual conversation (messages, `conversationId`)
 * lives in `SinghaAssistant` itself, so it naturally persists across opens/closes and page
 * navigations for as long as the tab is open — one continuous conversation, many entrances,
 * matching the "single Singha conversation brain" the backend already implements.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<AssistantSeed>({});

  const openAssistant = useCallback((next?: AssistantSeed) => {
    setSeed(next ?? {});
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<AssistantContextValue>(
    () => ({ open, seed, openAssistant, close }),
    [open, seed, openAssistant, close],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

/**
 * Access the shared Singha Assistant panel state. Used by `SinghaAssistant` (the launcher/panel
 * itself) and by any trigger (`AskSinghaButton`) that wants to open it pre-seeded. Falls back to a
 * safe no-op outside a provider (e.g. a component rendered in isolation in a test) rather than
 * throwing, since opening the assistant is always an optional enhancement, never a hard dependency.
 */
export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    return { open: false, seed: {}, openAssistant: () => {}, close: () => {} };
  }
  return ctx;
}
