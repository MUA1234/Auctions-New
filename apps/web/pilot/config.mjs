/**
 * Singha Synthetic Customer Pilot — configuration + environment safety.
 *
 * Reusable across environments. Point it at a target with env vars; it refuses to run
 * against anything that looks like unrestricted production unless PILOT_ALLOW_REMOTE=1,
 * and it asserts (via the live /feature-flags) that binding/provider surfaces are OFF
 * before any journey touches commercial state.
 *
 *   PILOT_BASE_URL   frontend origin      (default http://localhost:3000)
 *   PILOT_API_URL    backend origin       (default http://localhost:4000)  [+ /api/v1]
 *   PILOT_DB         psql conn for state verification (optional; local only)
 *   PILOT_ALLOW_REMOTE=1  permit a non-localhost target (staging). Never bypasses the
 *                          provider-off assertion.
 *   PILOT_EVO=1      append ?evo=on&v3=on to FE navigations (default on for local)
 */

export const BASE_URL = process.env.PILOT_BASE_URL || 'http://localhost:3000';
export const API_URL = process.env.PILOT_API_URL || 'http://localhost:4000';
export const API_V1 = `${API_URL}/api/v1`;
export const API_V2 = `${API_URL}/api/v2`;
export const CHROMIUM = process.env.PILOT_CHROMIUM || '/opt/pw-browsers/chromium';
export const EVO_PREVIEW = process.env.PILOT_EVO !== '0';

// A stable-per-run identifier. Every synthetic account/listing this run creates is tagged
// with this so the data is unmistakably a simulation and one run's data is separable.
export const RUN_ID =
  process.env.PILOT_RUN_ID ||
  `SIM-${new Date()
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14)}`;
export const SIM_PREFIX = '[SIM]';

/** Widths the pilot exercises. Mobile-first: 390 is a primary journey width, not a screenshot check. */
export const WIDTHS = [
  { name: 'mobile', w: 390, h: 844 },
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'desktop', w: 1440, h: 900 },
  { name: 'wide', w: 1920, h: 1080 },
];

export const OUT_DIR =
  process.env.PILOT_OUT ||
  '/tmp/claude-0/-home-user/30fc15c7-6d94-58cf-b0f8-5ce16fb71446/scratchpad/pilot';

/** Append the preview flags to a FE path (per-browser controlled preview). */
export function feUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!EVO_PREVIEW) return BASE_URL + p;
  return BASE_URL + p + (p.includes('?') ? '&' : '?') + 'evo=on&v3=on';
}

function isLocal(u) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(u);
}

/**
 * Refuse to run against a remote target unless explicitly allowed, and ALWAYS assert
 * that binding/provider surfaces are disabled on the target before any journey runs.
 */
export async function assertSafeEnvironment() {
  const remote = !isLocal(BASE_URL) || !isLocal(API_URL);
  if (remote && process.env.PILOT_ALLOW_REMOTE !== '1') {
    throw new Error(
      `SAFETY: target is not local (${BASE_URL} / ${API_URL}) and PILOT_ALLOW_REMOTE!=1. Refusing to run.`,
    );
  }
  let flags;
  try {
    const r = await fetch(`${API_V1}/feature-flags`);
    flags = (await r.json())?.features ?? {};
  } catch (e) {
    throw new Error(
      `SAFETY: could not read ${API_V1}/feature-flags to verify providers are off: ${e.message}`,
    );
  }
  // These MUST be off for a safe pilot: real money and cross-border quote execution.
  const mustBeOff = ['operatorPayments', 'logisticsQuotes'];
  const on = mustBeOff.filter((k) => flags[k] === true);
  if (on.length) {
    throw new Error(
      `SAFETY: binding surfaces are ON (${on.join(', ')}). Refusing to run a synthetic pilot.`,
    );
  }
  return { remote, flags };
}
