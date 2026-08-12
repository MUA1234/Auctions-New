'use client';

import { Card } from '@singha/ui';
import type { BidCapacity, SecuritySummary } from '../../lib/member';
import { formatMoney } from '../../lib/format';
import {
  capacityMultiple,
  previewCapacityMinor,
  requiredSecurityBps,
} from '../../lib/credit-policy';

/**
 * Shared, calm Bid Capacity presentation (Revision 06 §25). Used by both the
 * /account overview and the dedicated /account/bid-capacity page so the meter,
 * security cards and policy note never drift apart. No flashing, no green/red
 * gamification of debt — restrained amber over a neutral track.
 */

/** Approved / Committed / Available meter. */
export function BidCapacityMeter({ capacity, live }: { capacity: BidCapacity; live?: boolean }) {
  const { approvedMinor, committedMinor, availableMinor, currency } = capacity;
  const pct = approvedMinor > 0 ? Math.min(100, (committedMinor / approvedMinor) * 100) : 0;
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Figure label="Approved" value={formatMoney(approvedMinor, currency)} />
        <Figure label="Committed" value={formatMoney(committedMinor, currency)} muted />
        <Figure label="Available" value={formatMoney(availableMinor, currency)} accent />
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-amber-300/70 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Committed share of approved bid capacity"
        />
      </div>
      <p className="mt-2 text-xs text-bone-500">
        {formatMoney(availableMinor, currency)} available to bid{live ? ' · updated live' : ''}.
      </p>
    </div>
  );
}

export function securityExpiry(s: SecuritySummary): { expired: boolean; expiringSoon: boolean } {
  if (s.expiresAt == null) return { expired: false, expiringSoon: false };
  const t = new Date(s.expiresAt).getTime();
  const now = Date.now();
  return { expired: t <= now, expiringSoon: t > now && t - now < 30 * 24 * 3_600_000 };
}

export function SecurityCards({ security }: { security: SecuritySummary[] }) {
  if (security.length === 0) {
    return <p className="text-sm text-bone-400">No deposits or guarantees on file.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {security.map((s, i) => (
        <SecurityCard key={i} s={s} />
      ))}
    </div>
  );
}

function SecurityCard({ s }: { s: SecuritySummary }) {
  const { expired, expiringSoon } = securityExpiry(s);
  const tone = expired
    ? 'text-red-300 border-red-400/25'
    : s.status === 'verified' || s.status === 'active'
      ? 'text-emerald-200/90 border-emerald-400/20'
      : 'text-amber-200 border-amber-300/20';
  return (
    <div className={`rounded-lg border ${tone} bg-white/[0.02] p-3`}>
      <p className="text-[11px] uppercase tracking-wider text-bone-500">
        {s.type.replace(/_/g, ' ')}
      </p>
      {s.issuingBank ? <p className="text-sm text-bone-200">{s.issuingBank}</p> : null}
      <p className="mt-1 text-base font-semibold text-bone">
        {formatMoney(s.faceAmountMinor, s.currency)}
      </p>
      <p className="mt-1 text-xs capitalize">
        {expired ? 'Expired' : s.status.replace(/_/g, ' ')}
        {s.expiresAt && !expired ? ` · expires ${new Date(s.expiresAt).toLocaleDateString()}` : ''}
        {expiringSoon ? ' · expiring soon' : ''}
      </p>
    </div>
  );
}

/**
 * Non-authoritative policy explanation (P1-09). Reads the configured required
 * security bps and shows the implied multiple with an explicit "subject to
 * Singha verification" caveat — the backend remains authoritative.
 */
export function CreditPolicyNote({ currency = 'LKR' }: { currency?: string }) {
  const bps = requiredSecurityBps();
  const mult = capacityMultiple(bps);
  const example = previewCapacityMinor(500_000_00, bps);
  return (
    <Card>
      <h2 className="font-display text-sm font-semibold text-bone">How bid capacity works</h2>
      <p className="mt-2 text-sm text-bone-400">
        Singha extends bid capacity against verified security. At{' '}
        {(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}% required security, every{' '}
        {formatMoney(100_00, currency)} of verified security supports about{' '}
        <span className="text-bone-200">{mult}×</span> in bid capacity — so{' '}
        {formatMoney(500_000_00, currency)} of security supports about{' '}
        <span className="text-bone-200">{formatMoney(example, currency)}</span>.
      </p>
      <p className="mt-2 text-xs text-bone-500">
        This is a guide only. Your final approved capacity is set by Singha after verifying your
        security and membership.
      </p>
    </Card>
  );
}

export function Figure({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-bone-500">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          accent ? 'text-amber-100' : muted ? 'text-bone-300' : 'text-bone'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
