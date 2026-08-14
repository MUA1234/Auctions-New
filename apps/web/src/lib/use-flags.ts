'use client';

import { useEffect, useState } from 'react';
import { apiBase } from './api';
import { DEFAULT_FLAGS, type FeatureFlags } from './flags';

/**
 * Client-side flag access for interactive surfaces. Starts from the safe
 * defaults (V3 off) and refines once the authoritative `/feature-flags` response
 * arrives, so nothing flashes a half-built V3 surface before flags are known.
 */
export function useFlags(): { flags: FeatureFlags; loading: boolean } {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/feature-flags`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { features?: Partial<FeatureFlags> } | null) => {
        if (active && body?.features) setFlags({ ...DEFAULT_FLAGS, ...body.features });
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { flags, loading };
}
