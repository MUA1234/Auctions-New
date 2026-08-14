'use client';

import { useEffect, useState } from 'react';
import { apiBase } from './api';
import { DEFAULT_FLAGS, type FeatureFlags, v3PreviewEnvOn, withV3Preview } from './flags';

const PREVIEW_COOKIE = 'singha_v3_preview';

/**
 * Read the per-viewer V3 preview override (client only). A staging deployment can set
 * `NEXT_PUBLIC_V3_PREVIEW=1`; separately, an owner can append `?v3=on` to any URL to turn
 * the V3 experience on for their browser (persisted in a cookie) and `?v3=off` to clear it.
 * Production with neither set resolves flags from the backend — all V3 OFF.
 */
function previewOverrideOn(): boolean {
  if (v3PreviewEnvOn()) return true;
  if (typeof document === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('v3');
    if (param === 'on' || param === 'off') {
      document.cookie = `${PREVIEW_COOKIE}=${param === 'on' ? '1' : ''};path=/;max-age=${
        param === 'on' ? 60 * 60 * 24 * 30 : 0
      };samesite=lax`;
      return param === 'on';
    }
    return document.cookie.split('; ').some((c) => c === `${PREVIEW_COOKIE}=1`);
  } catch {
    return false;
  }
}

/**
 * Client-side flag access for interactive surfaces. Starts from the safe defaults (V3 off,
 * plus any preview override so a review session never flashes V2 first) and refines once the
 * authoritative `/feature-flags` response arrives.
 */
export function useFlags(): { flags: FeatureFlags; loading: boolean } {
  const [preview] = useState(previewOverrideOn);
  const [flags, setFlags] = useState<FeatureFlags>(() => withV3Preview(DEFAULT_FLAGS, preview));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/feature-flags`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { features?: Partial<FeatureFlags> } | null) => {
        if (active && body?.features)
          setFlags(withV3Preview({ ...DEFAULT_FLAGS, ...body.features }, preview));
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [preview]);

  return { flags, loading };
}
