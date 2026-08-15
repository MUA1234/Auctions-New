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
  // Singha Evolution (geography-/category-neutral platform). Own preview channel
  // (`?evo=on`) so these never entangle with the V3 visual preview switch.
  neutralIaV1: boolean;
}

/** The eleven V3 experience flags, in review order (the preview switch flips all of them). */
export const V3_FLAG_KEYS = [
  'v3VisualArchitecture',
  'flowMatrixV3',
  'categoryOverlayV3',
  'featuredReelV3',
  'discoverV3',
  'buyerTwinV3',
  'bidBattleV3',
  'gestureBidV3',
  'engagementV3',
  'dashboardV3Beta',
  'liveV3',
] as const satisfies readonly (keyof FeatureFlags)[];

/**
 * Overlay every V3 experience flag to ON. This is the review/preview switch: it lets a
 * staging deployment (or an owner review cookie) show the full V3 experience WITHOUT
 * changing production defaults — production still resolves flags from the backend, all OFF.
 * It never turns anything off, so a genuinely-enabled prod flag is preserved.
 */
export function withV3Preview(flags: FeatureFlags, on: boolean): FeatureFlags {
  if (!on) return flags;
  const next = { ...flags };
  for (const key of V3_FLAG_KEYS) next[key] = true;
  return next;
}

/**
 * V3 preview via env — set `NEXT_PUBLIC_V3_PREVIEW=1` ONLY on a staging/review deployment so
 * the owner can see V3 with production untouched. Unset/absent in production ⇒ defaults OFF.
 */
export function v3PreviewEnvOn(): boolean {
  const v = process.env.NEXT_PUBLIC_V3_PREVIEW;
  return v === '1' || v === 'true';
}

/**
 * Singha Evolution preview flags (E1+). A dedicated channel, separate from the V3 visual
 * preview, so the geography-/category-neutral platform can be previewed independently and
 * grow phase by phase without re-flipping V3 visuals.
 */
export const EVOLUTION_FLAG_KEYS = [
  'neutralIaV1',
] as const satisfies readonly (keyof FeatureFlags)[];

/** Overlay every Evolution flag to ON (review/preview switch; never turns anything off). */
export function withEvolutionPreview(flags: FeatureFlags, on: boolean): FeatureFlags {
  if (!on) return flags;
  const next = { ...flags };
  for (const key of EVOLUTION_FLAG_KEYS) next[key] = true;
  return next;
}

/** Evolution preview via env — `NEXT_PUBLIC_EVO_PREVIEW=1` on a staging/review deploy only. */
export function evolutionPreviewEnvOn(): boolean {
  const v = process.env.NEXT_PUBLIC_EVO_PREVIEW;
  return v === '1' || v === 'true';
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
  neutralIaV1: false,
};

/**
 * Fetch the authoritative flag set. Revalidates every 30s so a server-side flip
 * propagates quickly without hammering the API. On any error we fall back to the
 * safe defaults (V3 off) — we do NOT throw, because a flags outage must never take
 * down a public page, but we also never fabricate an "on" state.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const withPreviews = (f: FeatureFlags) =>
    withEvolutionPreview(withV3Preview(f, v3PreviewEnvOn()), evolutionPreviewEnvOn());
  try {
    const res = await fetch(`${apiBase}/feature-flags`, { next: { revalidate: 30 } });
    if (!res.ok) return withPreviews(DEFAULT_FLAGS);
    const body = (await res.json()) as { features?: Partial<FeatureFlags> };
    return withPreviews({ ...DEFAULT_FLAGS, ...(body.features ?? {}) });
  } catch {
    return withPreviews(DEFAULT_FLAGS);
  }
}
