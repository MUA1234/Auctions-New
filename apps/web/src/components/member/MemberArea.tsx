'use client';

import { useEffect, useState } from 'react';
import { Card, Chip } from '@singha/ui';
import { fetchMemberSelf, type MemberSelf, type SecuritySummary } from '../../lib/member';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';

/**
 * Customer member area (Revision 05 §21/§22). Renders the SELF view only —
 * Client ID, membership, Bid Capacity (Approved / Committed / Available), security
 * summary and temporary access. It never shows internal score, flags or staff
 * notes; those live behind the staff Member 360 and are not even sent here.
 */
export function MemberArea() {
  const { token, loading } = useAuth();
  const [member, setMember] = useState<MemberSelf | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchMemberSelf(token)
      .then((m) => alive && setMember(m))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) return <MemberSkeleton />;
  if (!token) {
    return (
      <Card className="mt-8">
        <p className="text-bone-400">
          Sign in to see your Singha membership, Client ID and Bid Capacity.
        </p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="mt-8">
        <p className="text-bone-400">We couldn’t load your membership just now. Please retry.</p>
      </Card>
    );
  }
  if (!member) return <MemberSkeleton />;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <MemberPassport member={member} />
      <div className="flex flex-col gap-6">
        <BidCapacityPanel member={member} />
        <SecurityPanel security={member.security} />
      </div>
    </div>
  );
}

/**
 * The Singha Member Passport — the Client ID presented as an operationally
 * important credential, not a raw database field (§22). The QR encodes only an
 * opaque lookup reference (the Client ID), never sensitive data.
 */
function MemberPassport({ member }: { member: MemberSelf }) {
  const temp = member.temporaryAccess[0];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/15 bg-gradient-to-br from-coal-800/90 to-coal-950 p-6 shadow-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/5 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="font-serif text-lg font-bold tracking-tight text-bone">Singha</span>
        <MembershipBadge status={member.membership.status} />
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-widest text-bone-500">Client ID</p>
      <p className="font-mono text-2xl font-semibold tracking-wider text-amber-100">
        {member.clientReference ?? '—'}
      </p>
      <p className="mt-4 text-sm text-bone-200">{member.legalName ?? 'Singha member'}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {member.roles.map((r) => (
          <Chip key={r} tone="neutral">
            {r === 'buyer' ? 'Buyer' : 'Seller'}
          </Chip>
        ))}
        <Chip tone={member.kycStatus === 'verified' ? 'win' : 'neutral'}>
          {member.kycStatus === 'verified' ? 'Verified' : `KYC ${member.kycStatus}`}
        </Chip>
      </div>
      {temp ? (
        <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100">
          Temporary access · {temp.scopeType}
          {temp.expiresAt ? ` · until ${new Date(temp.expiresAt).toLocaleString()}` : ''}
        </div>
      ) : null}
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-bone-500">Available capacity</p>
          <p className="text-lg font-semibold text-bone">
            {formatMoney(member.bidCapacity.availableMinor, member.bidCapacity.currency)}
          </p>
        </div>
        <PassportQr value={member.clientReference ?? ''} />
      </div>
    </div>
  );
}

/** Calm, premium Bid Capacity meter — Approved / Committed / Available (§9). */
function BidCapacityPanel({ member }: { member: MemberSelf }) {
  const { approvedMinor, committedMinor, availableMinor, currency, hasFacility } =
    member.bidCapacity;

  if (!hasFacility) {
    return (
      <Card>
        <h2 className="font-display text-sm font-semibold text-bone">Bid Capacity</h2>
        <p className="mt-2 text-sm text-bone-400">
          You don’t have an approved bid capacity yet. Add a deposit or bank guarantee to bid on
          credit, or contact Singha to arrange it.
        </p>
        <a
          href="/account/security"
          className="mt-4 inline-block rounded-md border border-amber-300/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
        >
          Set up Bid Capacity
        </a>
      </Card>
    );
  }

  const pct = approvedMinor > 0 ? Math.min(100, (committedMinor / approvedMinor) * 100) : 0;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-bone">Bid Capacity</h2>
        <span className="text-xs text-bone-500">Updated live</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Figure label="Approved" value={formatMoney(approvedMinor, currency)} />
        <Figure label="Committed" value={formatMoney(committedMinor, currency)} muted />
        <Figure label="Available" value={formatMoney(availableMinor, currency)} accent />
      </div>
      {/* Restrained meter — committed portion in amber over the approved line. No
          flashing, no green/red gamification (§9). */}
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
        {formatMoney(availableMinor, currency)} available to bid.
      </p>
    </Card>
  );
}

function SecurityPanel({ security }: { security: SecuritySummary[] }) {
  return (
    <Card>
      <h2 className="font-display text-sm font-semibold text-bone">Security &amp; deposits</h2>
      {security.length === 0 ? (
        <p className="mt-2 text-sm text-bone-400">No deposits or guarantees on file.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {security.map((s, i) => (
            <SecurityCard key={i} s={s} />
          ))}
        </div>
      )}
    </Card>
  );
}

function SecurityCard({ s }: { s: SecuritySummary }) {
  const expiringSoon =
    s.expiresAt != null &&
    new Date(s.expiresAt).getTime() - Date.now() < 30 * 24 * 3_600_000 &&
    new Date(s.expiresAt).getTime() > Date.now();
  const expired = s.expiresAt != null && new Date(s.expiresAt).getTime() <= Date.now();
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

function Figure({
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

function MembershipBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'win'
      : status === 'temporary'
        ? 'gold'
        : status === 'suspended' || status === 'blocked'
          ? 'outbid'
          : 'neutral';
  return <Chip tone={tone}>{status}</Chip>;
}

/** Tiny deterministic QR-like glyph from the opaque Client ID (no sensitive data). */
function PassportQr({ value }: { value: string }) {
  const cells: boolean[] = [];
  for (let i = 0; i < 49; i += 1) {
    let h = i * 2654435761;
    for (let j = 0; j < value.length; j += 1) h = (h ^ value.charCodeAt(j)) * 16777619;
    cells.push((h & 1) === 1);
  }
  return (
    <div
      className="grid h-14 w-14 grid-cols-7 gap-px rounded bg-bone/5 p-1"
      aria-label={`Member lookup code ${value}`}
    >
      {cells.map((on, i) => (
        <span key={i} className={on ? 'bg-bone/80' : 'bg-transparent'} />
      ))}
    </div>
  );
}

function MemberSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
      <div className="flex flex-col gap-6">
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
