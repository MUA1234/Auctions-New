/**
 * Client-side credit-policy PREVIEW only (Revision 06 P1-05 / P1-09).
 *
 * The authoritative 5% security policy, capacity and every credit decision live
 * in the backend. This is a non-authoritative preview so a member can see the
 * shape of the calculation before Singha verifies anything. It is configurable
 * (never hard-coded in component markup) via a public env var with a safe 5%
 * default, and every surface that shows it must label it "subject to Singha
 * verification".
 */
export const DEFAULT_REQUIRED_SECURITY_BPS = 500; // 5% → 20× capacity

/** Configured required-security basis points (safe default 5%). */
export function requiredSecurityBps(): number {
  const raw = Number(process.env.NEXT_PUBLIC_CREDIT_REQUIRED_SECURITY_BPS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REQUIRED_SECURITY_BPS;
}

/** Capacity multiple implied by the required-security bps (e.g. 500 → 20×). */
export function capacityMultiple(bps = requiredSecurityBps()): number {
  return bps > 0 ? 10_000 / bps : 0;
}

/**
 * Preview the calculated bid capacity for a security face value, in the same
 * minor units. Non-authoritative. Uses integer math on the minor amount to stay
 * clear of floating-point drift on the displayed figure.
 */
export function previewCapacityMinor(securityMinor: number, bps = requiredSecurityBps()): number {
  if (!Number.isFinite(securityMinor) || securityMinor <= 0 || bps <= 0) return 0;
  return Math.floor((securityMinor * 10_000) / bps);
}
