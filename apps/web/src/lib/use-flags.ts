'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBase } from './api';
import {
  DEFAULT_FLAGS,
  type FeatureFlags,
  evolutionPreviewEnvOn,
  v3PreviewEnvOn,
  withEvolutionPreview,
  withV3Preview,
} from './flags';

const PREVIEW_COOKIE = 'singha_v3_preview';
const EVO_COOKIE = 'singha_evo_preview';

/** Read a `?<param>=on|off` override, persisting/clearing a 30-day cookie (client only). */
function readPreviewOverride(param: string, cookie: string, envOn: boolean): boolean {
  if (envOn) return true;
  if (typeof document === 'undefined') return false;
  try {
    const value = new URLSearchParams(window.location.search).get(param);
    if (value === 'on' || value === 'off') {
      document.cookie = `${cookie}=${value === 'on' ? '1' : ''};path=/;max-age=${
        value === 'on' ? 60 * 60 * 24 * 30 : 0
      };samesite=lax`;
      return value === 'on';
    }
    return document.cookie.split('; ').some((c) => c === `${cookie}=1`);
  } catch {
    return false;
  }
}

/**
 * Read the per-viewer V3 preview override (client only). A staging deployment can set
 * `NEXT_PUBLIC_V3_PREVIEW=1`; separately, an owner can append `?v3=on` to any URL to turn
 * the V3 experience on for their browser (persisted in a cookie) and `?v3=off` to clear it.
 * Production with neither set resolves flags from the backend — all V3 OFF.
 */
function previewOverrideOn(): boolean {
  return readPreviewOverride('v3', PREVIEW_COOKIE, v3PreviewEnvOn());
}

/**
 * Singha Evolution preview (`?evo=on`, cookie `singha_evo_preview`, or `NEXT_PUBLIC_EVO_PREVIEW`).
 * Independent of the V3 visual preview so the neutral platform can be reviewed on its own.
 */
function evolutionOverrideOn(): boolean {
  return readPreviewOverride('evo', EVO_COOKIE, evolutionPreviewEnvOn());
}

/**
 * Client-side flag access for interactive surfaces. Starts from the safe defaults (V3 off,
 * plus any preview override so a review session never flashes V2 first) and refines once the
 * authoritative `/feature-flags` response arrives.
 */
export function useFlags(): { flags: FeatureFlags; loading: boolean } {
  const [preview] = useState(previewOverrideOn);
  const [evo] = useState(evolutionOverrideOn);
  const applyPreviews = useCallback(
    (f: FeatureFlags) => withEvolutionPreview(withV3Preview(f, preview), evo),
    [preview, evo],
  );
  // The first render must match SSR, which cannot see the per-browser preview cookie/param — so
  // start from DEFAULT_FLAGS with NO preview override applied. Applying the override synchronously
  // here would make the client's first (hydration) render disagree with the server-rendered HTML,
  // forcing React to discard the hydrated tree (hydration errors #418/#423, and on some production
  // routes an unrecovered #329). The preview override + backend flags are applied AFTER mount.
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apply the client-only preview override immediately on mount, so the preview experience
    // appears right after hydration without waiting for the backend flags fetch.
    setFlags((f) => applyPreviews(f));
    let active = true;
    fetch(`${apiBase}/feature-flags`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { features?: Partial<FeatureFlags> } | null) => {
        if (active && body?.features)
          setFlags(applyPreviews({ ...DEFAULT_FLAGS, ...body.features }));
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [applyPreviews]);

  return { flags, loading };
}
