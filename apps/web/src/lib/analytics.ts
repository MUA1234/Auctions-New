'use client';

import { useCallback } from 'react';
import { recordProductEvent } from './api';
import { useAuth } from './auth';
import { useFlags } from './use-flags';

export type AnalyticsSurface =
  'DASHBOARD' | 'DISCOVER' | 'FLOW' | 'LOT' | 'NOTIFICATION' | 'LIVE' | 'BID_BATTLE';

function anonSession(): string | undefined {
  try {
    const k = 'singha_anon_session';
    let v = localStorage.getItem(k);
    if (!v) {
      v = `anon_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return undefined;
  }
}

/**
 * Privacy-safe product analytics for the V3 dashboard pilot (pack doc 09). `track` is a
 * NO-OP unless `dashboardV3Beta` is enabled server-side, so no instrumentation fires until
 * the pilot gate opens. It records only a surface + action (+ optional listing/funnel
 * step) — never PII — and is fire-and-forget so it can never affect the experience.
 */
export function useAnalytics() {
  const { token } = useAuth();
  const { flags } = useFlags();
  const enabled = flags.dashboardV3Beta;

  const track = useCallback(
    (
      surface: AnalyticsSurface,
      action: string,
      opts: { listingId?: string; funnelStep?: string } = {},
    ) => {
      if (!enabled) return;
      void recordProductEvent(
        {
          surface,
          action,
          ...opts,
          ...(token ? {} : { anonymousSessionId: anonSession() }),
        },
        token ?? undefined,
      );
    },
    [enabled, token],
  );

  return { track, enabled };
}
