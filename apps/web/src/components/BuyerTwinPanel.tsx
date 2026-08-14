'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Chip } from '@singha/ui';
import { type BuyerTwinSummary, fetchBuyerTwin, resetDiscoveryPreferences } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatMoney } from '../lib/format';

const CONFIDENCE_LABEL: Record<BuyerTwinSummary['confidence'], string> = {
  none: 'Still learning',
  low: 'Getting to know you',
  medium: 'Good sense of your taste',
  high: 'Strong match',
};

/**
 * "Why am I seeing this?" — the safe, customer-facing Buyer Twin summary (pack doc 04
 * §C/§D). It renders ONLY the safe projection the backend chooses to expose (category
 * labels, a bucketed confidence, an explainable price band and reason strings). The
 * Tier-A ranking weights and raw affinity scores never reach the browser — this panel
 * has no access to them by construction.
 *
 * The Buyer Twin is never used for credit, KYC, bidding permission or any financial
 * decision (pack doc 04 §C). "Reset preferences" clears only the discovery signal
 * ledger + projection; watches, bids, offers, purchases and payments are untouched.
 */
export function BuyerTwinPanel() {
  const { token, loading: authLoading } = useAuth();
  const [twin, setTwin] = useState<BuyerTwinSummary | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'resetting'>('idle');

  const load = useCallback((t: string) => {
    setState('loading');
    fetchBuyerTwin(t)
      .then((s) => {
        setTwin(s);
        setState('idle');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    if (token) load(token);
    else setTwin(null);
  }, [token, load]);

  async function reset() {
    if (!token) return;
    setState('resetting');
    try {
      await resetDiscoveryPreferences(token);
      load(token);
    } catch {
      setState('error');
    }
  }

  // Signed-out or auth still resolving: the panel is a personal insight, so we simply
  // don't render it (the deck itself works for anonymous sessions).
  if (authLoading || !token) return null;
  if (state === 'error') return null;
  if (!twin) {
    return <p className="text-center text-xs text-bone-600">Loading your Discover profile…</p>;
  }

  const hasSignal = twin.confidence !== 'none' || twin.topCategories.length > 0;

  return (
    <Card className="mx-auto mt-8 max-w-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-bone">
            Why you&rsquo;re seeing these
          </h2>
          <p className="mt-0.5 text-xs text-bone-500">{CONFIDENCE_LABEL[twin.confidence]}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={state === 'resetting'}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-bone-300 transition hover:text-bone disabled:opacity-50"
        >
          {state === 'resetting' ? 'Resetting…' : 'Reset preferences'}
        </button>
      </div>

      {!hasSignal ? (
        <p className="mt-3 text-sm text-bone-400">
          Swipe through a few lots and we&rsquo;ll tune Discover to what you like. Nothing here
          affects your bids or account.
        </p>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          {twin.topCategories.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-bone-600">Interested in</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {twin.topCategories.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            </div>
          )}
          {twin.priceBandMinor && (
            <p className="text-bone-300">
              Usually around{' '}
              <span className="text-bone">
                {formatMoney(twin.priceBandMinor.min)}–{formatMoney(twin.priceBandMinor.max)}
              </span>
            </p>
          )}
          {twin.explanations.length > 0 && (
            <ul className="space-y-1 text-xs text-emerald-300/90">
              {twin.explanations.slice(0, 3).map((e) => (
                <li key={e}>✦ {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-bone-600">
        This is a personalisation aid only. It never affects your bidding, credit or account
        standing.
      </p>
    </Card>
  );
}
