'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { Button, cn } from '@singha/ui';
import { useFlags } from '../../lib/use-flags';
import { useAssistant } from './AssistantProvider';
import { AssistantGlyph } from './AssistantGlyph';

export interface AskSinghaButtonProps {
  /** The listing this button opens the assistant against — becomes the seeded item context on
   *  the next message (`AssistantProvider`'s `openAssistant`). */
  listingId: string;
  /** The page URL, for context only (defaults to the current page when omitted). */
  url?: string;
  /** `full` — labelled secondary action for the lot detail page. `compact` — small unobtrusive
   *  icon-only affordance for `SaleCard`. */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * Reusable "Ask Singha AI" trigger (AIC-5) — opens the shared assistant panel pre-seeded with a
 * listing. Self-gates on `aiConversation` like every other new assistant surface, so callers (the
 * lot detail page, `SaleCard`) can render it unconditionally and it renders nothing when the flag
 * is off, keeping production untouched.
 */
export function AskSinghaButton({
  listingId,
  url,
  variant = 'full',
  className,
}: AskSinghaButtonProps) {
  const { flags } = useFlags();
  const { openAssistant } = useAssistant();

  if (!flags.aiConversation) return null;

  function openChat() {
    openAssistant({ listingId, url });
  }

  if (variant === 'compact') {
    // `SaleCard`'s compact marker sits INSIDE its card-wide `<Link>` — nesting a real `<button>`
    // inside an `<a>` is invalid HTML (interactive content), so this is a keyboard-operable
    // `role="button"` span instead (stop/prevent so it opens the assistant instead of navigating).
    function handleClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      openChat();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      openChat();
    }
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label="Ask Singha AI about this lot"
        title="Ask Singha AI"
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-coal-950/70 text-bone-200 backdrop-blur-md transition-colors hover:border-gold-400/50 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60',
          className,
        )}
      >
        <AssistantGlyph className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={openChat}
      className={cn('w-full gap-2', className)}
    >
      <AssistantGlyph className="h-4 w-4" />
      Ask Singha AI
    </Button>
  );
}
