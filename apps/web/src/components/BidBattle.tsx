'use client';

import { useCallback, useEffect, useState } from 'react';
import { type RivalryView, fetchRivalry } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useFlags } from '../lib/use-flags';
import { formatMoney } from '../lib/format';

const MOMENT_STYLE: Record<RivalryView['moments'][number]['kind'], { icon: string; cls: string }> =
  {
    lead_taken: { icon: '•', cls: 'text-bone-300' },
    comeback: { icon: '↑', cls: 'text-win' },
    you_outbid: { icon: '⚠', cls: 'text-outbid' },
  };

function momentText(kind: RivalryView['moments'][number]['kind'], who: string): string {
  if (kind === 'you_outbid') return `${who} outbid you`;
  if (kind === 'comeback') return who === 'You' ? 'You retook the lead' : `${who} retook the lead`;
  return who === 'You' ? 'You took the lead' : `${who} took the lead`;
}

/**
 * Bid Battle rivalry strip (pack doc 05), gated on `bidBattleV3`. A live, privacy-safe
 * read of the auction's rivalry: YOU vs the current leader/challenger, the gap to the next
 * valid bid, active-bidder count and recent lead-change moments. Every rival is an alias;
 * the viewer is "You". This surface is READ-ONLY — nothing here places or changes a bid;
 * the authoritative bid control lives in the bid panel on the same page.
 */
export function BidBattle({
  auctionId,
  currency = 'LKR',
}: {
  auctionId: string;
  currency?: string;
}) {
  const { flags } = useFlags();
  const { token } = useAuth();
  const [view, setView] = useState<RivalryView | null>(null);
  const enabled = flags.bidBattleV3;

  const load = useCallback(() => {
    fetchRivalry(auctionId, token ?? undefined)
      .then(setView)
      .catch(() => setView(null));
  }, [auctionId, token]);

  useEffect(() => {
    if (!enabled) return;
    load();
    // Poll for live rivalry updates (non-authoritative flavour; the bid engine and its
    // SSE stream remain the source of truth). Cheap and self-healing on error.
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [enabled, load]);

  // Render nothing until the flag is on AND a contest actually exists.
  if (!enabled || !view || view.activeBidderCount === 0) return null;

  const headline = view.youAreLeading
    ? "You're in the lead"
    : view.leader
      ? `${view.leader} is leading`
      : 'Bidding is open';
  const rival = view.youAreLeading ? view.challenger : view.leader;

  return (
    <section
      aria-label="Bid Battle"
      className="mt-4 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-sm font-semibold text-bone">
          <span aria-hidden className="text-gold-400">
            ⚔
          </span>
          Bid Battle
        </p>
        <span className="text-xs text-bone-500">
          {view.activeBidderCount} {view.activeBidderCount === 1 ? 'bidder' : 'bidders'}
        </span>
      </div>

      <p className={`mt-2 text-lg font-bold ${view.youAreLeading ? 'text-win' : 'text-bone'}`}>
        {headline}
      </p>
      {rival && (
        <p className="mt-0.5 text-sm text-bone-400">
          {view.youAreLeading ? 'Nearest challenger' : 'You vs'}{' '}
          <span className="font-medium text-bone-200">{rival}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-bone-400">
        {view.nextValidBidMinor != null && (
          <span>
            Next bid{' '}
            <span className="tabular font-medium text-gold-400">
              {formatMoney(view.nextValidBidMinor, currency)}
            </span>
          </span>
        )}
        {view.leadChanges > 0 && (
          <span>
            {view.leadChanges} lead {view.leadChanges === 1 ? 'change' : 'changes'}
          </span>
        )}
      </div>

      {view.moments.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
          {view.moments
            .slice(-3)
            .reverse()
            .map((m) => (
              <li
                key={m.sequence}
                className={`flex items-center gap-2 text-xs ${MOMENT_STYLE[m.kind].cls}`}
              >
                <span aria-hidden>{MOMENT_STYLE[m.kind].icon}</span>
                {momentText(m.kind, m.who)}
              </li>
            ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-bone-600">
        Aliases protect every bidder&rsquo;s identity. This is live context only — it never places a
        bid.
      </p>
    </section>
  );
}
