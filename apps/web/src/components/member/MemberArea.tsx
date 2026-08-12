'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, Chip } from '@singha/ui';
import { fetchMemberSelf, type MemberSelf } from '../../lib/member';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';
import { memberLookupPayload } from '../../lib/passport';
import { BidCapacityMeter, SecurityCards } from './capacity';

/**
 * Customer member area (Revision 05 §21/§22, Revision 06 §25). Renders the SELF
 * view only — Client ID, membership, a Bid Capacity summary and security. It
 * never shows internal score, flags or staff notes; those live behind the staff
 * Member 360 and are not even sent here. The detailed capacity + policy + request
 * flow lives on /account/bid-capacity; account security/MFA on /account/security.
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
        <BidCapacitySummary member={member} />
        <SecurityPanel member={member} />
      </div>
    </div>
  );
}

/**
 * The Singha Member Passport — the Client ID presented as an operationally
 * important credential (§22). The QR is a REAL scannable code (P1-13) that
 * encodes only an opaque lookup reference, never sensitive data.
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
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-bone-500">Available capacity</p>
          <p className="text-lg font-semibold text-bone">
            {formatMoney(member.bidCapacity.availableMinor, member.bidCapacity.currency)}
          </p>
        </div>
        <PassportQr value={member.clientReference} />
      </div>
    </div>
  );
}

/** Compact capacity summary on the overview; the full view is /account/bid-capacity. */
function BidCapacitySummary({ member }: { member: MemberSelf }) {
  const { hasFacility } = member.bidCapacity;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-bone">Bid Capacity</h2>
        <a
          href="/account/bid-capacity"
          className="text-xs font-medium text-amber-200 hover:text-amber-100"
        >
          Manage →
        </a>
      </div>
      {hasFacility ? (
        <div className="mt-4">
          <BidCapacityMeter capacity={member.bidCapacity} live />
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-bone-400">
            You don’t have an approved bid capacity yet. Add a deposit or bank guarantee to bid on
            credit.
          </p>
          <a
            href="/account/bid-capacity"
            className="mt-4 inline-block rounded-md border border-amber-300/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
          >
            Set up Bid Capacity
          </a>
        </>
      )}
    </Card>
  );
}

function SecurityPanel({ member }: { member: MemberSelf }) {
  return (
    <Card>
      <h2 className="font-display text-sm font-semibold text-bone">Security &amp; deposits</h2>
      <div className="mt-4">
        <SecurityCards security={member.security} />
      </div>
    </Card>
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

/**
 * Real scannable Member Passport QR (P1-13): a genuine QR (not a decorative
 * glyph) encoding only the opaque lookup reference, on a high-contrast light
 * tile so a staff scanner reads it reliably. Printable (SVG). Renders a neutral
 * placeholder when the member has no Client ID yet.
 */
function PassportQr({ value }: { value: string | null }) {
  const payload = memberLookupPayload(value);
  if (!payload) {
    return (
      <div
        className="grid h-[76px] w-[76px] place-items-center rounded-lg bg-white/5 text-[10px] text-bone-600"
        aria-hidden
      >
        no code
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-white p-1.5 shadow-sm" title={`Member lookup · ${value}`}>
      <QRCodeSVG
        value={payload}
        size={64}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#0b0b0d"
        title={`Member lookup code for ${value}`}
      />
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
