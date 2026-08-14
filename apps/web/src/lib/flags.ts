import { apiBase } from './api';

/**
 * V3 experience feature flags. The BACKEND is the source of truth
 * (`GET /api/v1/feature-flags`, server/config-controlled per pack doc 21); the
 * frontend only gates presentation on them. Every V3 flag defaults to `false`,
 * so if the endpoint is unavailable the UI safely renders the current (V2)
 * experience rather than a half-built V3 surface — and a flag can be flipped
 * server-side for rapid rollout/rollback without a frontend redeploy.
 */
export interface FeatureFlags {
  // Sale methods (existing)
  timedAuctions: boolean;
  eoi: boolean;
  buyNow: boolean;
  makeOffer: boolean;
  sealedTender: boolean;
  liveAuctions: boolean;
  // V3 experience
  v3VisualArchitecture: boolean;
  flowMatrixV3: boolean;
  categoryOverlayV3: boolean;
  featuredReelV3: boolean;
  discoverV3: boolean;
  buyerTwinV3: boolean;
  bidBattleV3: boolean;
  gestureBidV3: boolean;
  engagementV3: boolean;
  dashboardV3Beta: boolean;
  liveV3: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  timedAuctions: true,
  eoi: true,
  buyNow: true,
  makeOffer: true,
  sealedTender: true,
  liveAuctions: false,
  v3VisualArchitecture: false,
  flowMatrixV3: false,
  categoryOverlayV3: false,
  featuredReelV3: false,
  discoverV3: false,
  buyerTwinV3: false,
  bidBattleV3: false,
  gestureBidV3: false,
  engagementV3: false,
  dashboardV3Beta: false,
  liveV3: false,
};

/**
 * Fetch the authoritative flag set. Revalidates every 30s so a server-side flip
 * propagates quickly without hammering the API. On any error we fall back to the
 * safe defaults (V3 off) — we do NOT throw, because a flags outage must never take
 * down a public page, but we also never fabricate an "on" state.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const res = await fetch(`${apiBase}/feature-flags`, { next: { revalidate: 30 } });
    if (!res.ok) return DEFAULT_FLAGS;
    const body = (await res.json()) as { features?: Partial<FeatureFlags> };
    return { ...DEFAULT_FLAGS, ...(body.features ?? {}) };
  } catch {
    return DEFAULT_FLAGS;
  }
}
