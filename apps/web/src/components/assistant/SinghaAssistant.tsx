'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ScrollX, Sheet, Skeleton } from '@singha/ui';
import { useFlags } from '../../lib/use-flags';
import { useAuth } from '../../lib/auth';
import { useAssistant } from './AssistantProvider';
import { AssistantGlyph } from './AssistantGlyph';
import {
  askAssistant,
  assistantChannelRequest,
  getAssistantConversation,
  type AskAssistantRequest,
  type AssistantChannel,
  type AssistantChannelRequestResponse,
} from '../../lib/assistant-api';
import { friendlyMessage } from '../evolution/evo-api-error';

/** One rendered chat turn. `system` covers non-chat records (e.g. a channel-request note)
 *  hydrated from history — shown as a small centred caption, never a bubble. */
interface Turn {
  id: string;
  role: 'customer' | 'ai' | 'system';
  text: string;
}

const STORAGE_KEY = 'singha_assistant_conversation_id';

function localId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

/** Reactive `(min-width: 768px)` check (Tailwind's `md`) so the panel can be a bottom sheet on
 *  phones and a slide-in side panel on desktop while still using the shared `Sheet` primitive
 *  (which takes one static `side`, not a per-breakpoint one). Defaults to `false` (mobile/bottom)
 *  — the safe choice both before the client can measure the viewport and in `matchMedia`-less
 *  environments (this repo's jsdom test environment has no `matchMedia`; guarding here means
 *  tests that open the panel simply see the bottom-sheet layout, never a crash). */
function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

/**
 * The Singha AI conversation assistant (AIC-5) — floating launcher + slide-in/bottom-sheet panel.
 * Gated on `aiConversation` (mirrors the backend `FEATURE_AI_CONVERSATION`, default off): off
 * renders nothing at all, and — deliberately split into a thin gate + `SinghaAssistantPanel` below
 * rather than one component that calls every hook and returns `null` late — NONE of the panel's
 * state/effects/localStorage access is even instantiated when off. That split matters here more
 * than for a single-page surface like `BidBattle`: this component is mounted once in the root
 * layout, i.e. on every single page for every visitor, so "off" should cost nothing.
 */
export function SinghaAssistant() {
  const { flags } = useFlags();
  if (!flags.aiConversation) return null;
  return <SinghaAssistantPanel />;
}

function SinghaAssistantPanel() {
  const { open, seed, openAssistant, close } = useAssistant();
  const { flags } = useFlags();
  const { token, loading: authLoading } = useAuth();
  const pathname = usePathname() ?? '/';
  const isDesktop = useIsDesktopViewport();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const hydratedRef = useRef(false);
  // The listingId we've already attached to a message in the CURRENT conversation — re-seeding
  // (e.g. tapping "Ask Singha AI" on a second lot mid-conversation) attaches it again once it
  // changes, but a plain follow-up message doesn't repeat context the assistant already has.
  const lastContextRef = useRef<string | undefined>(undefined);

  const [phone, setPhone] = useState('');
  const [channelBusy, setChannelBusy] = useState<AssistantChannel | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [channelResult, setChannelResult] = useState<AssistantChannelRequestResponse | null>(null);

  // Persist the conversation id so a page reload can resume it (lazily, on first open only —
  // see below). Cleared if the stored conversation turns out to be gone/not ours.
  useEffect(() => {
    if (!conversationId) return;
    try {
      localStorage.setItem(STORAGE_KEY, conversationId);
    } catch {
      /* best-effort only */
    }
  }, [conversationId]);

  // Hydrate any previously-persisted conversation the FIRST time the panel is actually opened
  // (not eagerly on mount — this component lives on every page, so a network call should only
  // happen when the customer actually engages with it).
  useEffect(() => {
    if (!open || hydratedRef.current || !token) return;
    hydratedRef.current = true;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!stored) return;
    setHistoryLoading(true);
    getAssistantConversation(stored, token)
      .then((conv) => {
        setConversationId(conv.id);
        setTurns(
          conv.messages.map((m) => ({
            id: m.id,
            role:
              m.provenance === 'customer' ? 'customer' : m.provenance === 'ai' ? 'ai' : 'system',
            text: m.text,
          })),
        );
      })
      .catch(() => {
        // Gone, or not ours (404-not-403 by design) — start fresh rather than error.
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      })
      .finally(() => setHistoryLoading(false));
  }, [open, token]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy || !token) return;
      setInput('');
      setError(null);
      setSuggestions([]);
      setTurns((prev) => [...prev, { id: localId(), role: 'customer', text }]);
      setBusy(true);
      try {
        const attachContext = Boolean(seed.listingId) && seed.listingId !== lastContextRef.current;
        const body: AskAssistantRequest = {
          message: text,
          ...(conversationId ? { conversationId } : {}),
          ...(attachContext ? { listingId: seed.listingId, url: seed.url } : {}),
        };
        const res = await askAssistant(body, token);
        if (attachContext) lastContextRef.current = seed.listingId;
        setConversationId(res.conversationId);
        setTurns((prev) => [...prev, { id: localId(), role: 'ai', text: res.reply }]);
        setSuggestions(res.suggestions ?? []);
      } catch (err) {
        setError(friendlyMessage(err, 'Singha AI could not reply just now. Please try again.'));
      } finally {
        setBusy(false);
      }
    },
    [busy, token, seed.listingId, seed.url, conversationId],
  );

  const requestChannel = useCallback(
    async (channel: AssistantChannel) => {
      if (!token || !conversationId || channelBusy) return;
      setChannelBusy(channel);
      setChannelError(null);
      try {
        const res = await assistantChannelRequest(
          { conversationId, channel, phone: phone.trim() || undefined },
          token,
        );
        setChannelResult(res);
      } catch (err) {
        setChannelError(friendlyMessage(err, 'That channel is not available right now.'));
      } finally {
        setChannelBusy(null);
      }
    },
    [token, conversationId, channelBusy, phone],
  );

  return (
    <>
      {!open && <Launcher onOpen={() => openAssistant()} dockAware={flags.neutralIaV1} />}
      <Sheet
        open={open}
        onClose={close}
        label="Ask Singha"
        side={isDesktop ? 'right' : 'bottom'}
        className="flex flex-col"
      >
        <PanelHeader onClose={close} />

        {authLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ) : !token ? (
          <SignInGate next={pathname} />
        ) : (
          <>
            <MessageList turns={turns} thinking={busy} historyLoading={historyLoading} />
            <SuggestionsRow items={suggestions} disabled={busy} onPick={send} />
            {error && <p className="shrink-0 px-4 pb-1 text-xs text-outbid">{error}</p>}
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              sending={busy}
              placeholder={seed.listingId ? 'Ask about this lot…' : 'Ask Singha anything…'}
            />
            <ChannelRow
              conversationId={conversationId}
              phone={phone}
              onPhoneChange={setPhone}
              onRequest={requestChannel}
              busyChannel={channelBusy}
              error={channelError}
              result={channelResult}
            />
          </>
        )}
      </Sheet>
    </>
  );
}

/**
 * Floating launcher (bottom-right, gold). `dockAware` mirrors `LotStickyDock`'s own
 * `neutralIaV1`-gated offset technique: when the mobile bottom nav dock is mounted (small
 * viewports only, `md:hidden` there), sit above it using the SAME
 * `calc(dockHeight + env(safe-area-inset-bottom))` shape; otherwise just clear the safe area.
 */
function Launcher({ onOpen, dockAware }: { onOpen: () => void; dockAware: boolean }) {
  const bottom = dockAware
    ? 'bottom-[calc(3.75rem_+_env(safe-area-inset-bottom)_+_1rem)]'
    : 'bottom-[calc(env(safe-area-inset-bottom)_+_1rem)]';
  return (
    <Button
      type="button"
      variant="gold"
      onClick={onOpen}
      aria-label="Ask Singha AI"
      className={`fixed right-4 z-50 h-14 w-14 rounded-full p-0 md:bottom-6 md:right-6 ${bottom}`}
    >
      <AssistantGlyph className="h-6 w-6" />
    </Button>
  );
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
          <AssistantGlyph className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-bone">
            Ask Singha
            <span className="rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300">
              AI
            </span>
          </p>
          <p className="truncate text-[11px] text-bone-500">Listings, bidding &amp; your account</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bone-400 transition-colors hover:bg-white/10 hover:text-bone"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Compact sign-in gate replacing the input when signed out — the assistant endpoints all
 *  require an authenticated `ai:converse` customer, enforced server-side. */
function SignInGate({ next }: { next: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-400/25 bg-gold-500/[0.08] text-gold-300">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <div>
        <p className="font-display text-base font-semibold text-bone">
          Sign in to chat with Singha AI
        </p>
        <p className="mx-auto mt-1.5 max-w-[26ch] text-sm text-bone-500">
          Ask about listings, bidding or your account — Singha AI keeps context as you browse.
        </p>
      </div>
      <Link href={`/login?next=${encodeURIComponent(next)}`}>
        <Button variant="gold">Sign in</Button>
      </Link>
    </div>
  );
}

function MessageList({
  turns,
  thinking,
  historyLoading,
}: {
  turns: Turn[];
  thinking: boolean;
  historyLoading: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Guarded: not every environment implements `scrollIntoView` (e.g. this repo's jsdom test
    // environment doesn't), and it's a pure nice-to-have here — never worth a hard crash over.
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [turns.length, thinking]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
        {historyLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 self-end rounded-2xl" />
          </div>
        ) : (
          <>
            {turns.length === 0 && !thinking && (
              <Bubble role="ai">
                Hi, I&rsquo;m Singha AI. Ask me about a lot, bidding, payments or how Singha works.
              </Bubble>
            )}
            {turns.map((t) => (
              <Bubble key={t.id} role={t.role}>
                {t.text}
              </Bubble>
            ))}
            {thinking && <ThinkingBubble />}
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: Turn['role']; children: ReactNode }) {
  if (role === 'system') {
    return <p className="my-1 text-center text-[11px] text-bone-600">{children}</p>;
  }
  const mine = role === 'customer';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          mine
            ? 'rounded-br-sm border border-gold-400/20 bg-gold-500/[0.14] text-bone-100'
            : 'rounded-bl-sm border border-white/10 bg-coal-800/70 text-bone-200'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Singha AI is thinking">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-coal-800/70 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-bone-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionsRow({
  items,
  onPick,
  disabled,
}: {
  items: string[];
  onPick: (s: string) => void;
  disabled: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ScrollX className="flex shrink-0 gap-2 border-t border-white/10 px-4 py-2.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className="shrink-0 rounded-full border border-gold-400/25 bg-gold-500/[0.08] px-3 py-1.5 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-500/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </ScrollX>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  sending,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  sending: boolean;
  placeholder: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Message Singha AI"
        autoComplete="off"
        maxLength={2000}
        className="w-full rounded-full border border-white/10 bg-coal-900/60 px-4 py-2.5 text-sm text-bone placeholder:text-bone-500 focus:border-gold-400/50 focus:outline-none"
      />
      <button
        type="submit"
        disabled={sending || !value.trim()}
        aria-label="Send"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-coal-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}

function ChannelRow({
  conversationId,
  phone,
  onPhoneChange,
  onRequest,
  busyChannel,
  error,
  result,
}: {
  conversationId: string | null;
  phone: string;
  onPhoneChange: (v: string) => void;
  onRequest: (channel: AssistantChannel) => void;
  busyChannel: AssistantChannel | null;
  error: string | null;
  result: AssistantChannelRequestResponse | null;
}) {
  const disabled = !conversationId || busyChannel != null;
  return (
    <div className="shrink-0 border-t border-white/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          aria-current="true"
          className="inline-flex items-center gap-1.5 rounded-full border border-live/40 bg-live/10 px-3 py-1.5 text-xs font-semibold text-live"
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-live" />
          Chat now
        </span>
        <ChannelButton
          label="WhatsApp"
          disabled={disabled}
          busy={busyChannel === 'whatsapp'}
          onClick={() => onRequest('whatsapp')}
        />
        <ChannelButton
          label="Call me"
          disabled={disabled}
          busy={busyChannel === 'voice'}
          onClick={() => onRequest('voice')}
        />
      </div>

      {conversationId && !result && (
        <input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Phone number (optional)"
          aria-label="Phone number (optional)"
          maxLength={32}
          className="mt-2 w-full rounded-lg border border-white/10 bg-coal-900/50 px-3 py-1.5 text-xs text-bone placeholder:text-bone-600 focus:border-gold-400/40 focus:outline-none"
        />
      )}
      {!conversationId && (
        <p className="mt-1.5 text-[11px] text-bone-600">Say something first to switch channels.</p>
      )}
      {error && <p className="mt-2 text-xs text-outbid">{error}</p>}
      {result && (
        <div className="mt-2 rounded-lg border border-live/25 bg-live/[0.06] px-3 py-2 text-xs text-bone-200">
          {result.channel === 'whatsapp' && result.deepLink ? (
            <>
              <p>Continue this conversation on WhatsApp any time.</p>
              <a
                href={result.deepLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-semibold text-live hover:underline"
              >
                Open WhatsApp →
              </a>
            </>
          ) : (
            <p>Thanks — a Singha specialist will call you back shortly.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelButton({
  label,
  disabled,
  busy,
  onClick,
}: {
  label: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-bone-300 transition-colors hover:border-white/25 hover:text-bone disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? '…' : label}
    </button>
  );
}
