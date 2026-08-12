'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@singha/ui';
import { fetchMemberSelf, type MemberSelf } from '../../../lib/member';
import { useAuth } from '../../../lib/auth';
import { formatMoney } from '../../../lib/format';
import {
  BidCapacityMeter,
  CreditPolicyNote,
  SecurityCards,
} from '../../../components/member/capacity';

/**
 * Bid Capacity (Revision 06 P1-12). The customer's FINANCIAL capacity page —
 * distinct from /account/security (password + MFA). Shows Approved / Committed /
 * Available, security instruments with expiry state, a non-authoritative policy
 * explanation and how to add or review security. Reads the self view only
 * (GET /me/member) — never internal score, flags or staff notes.
 */
export default function BidCapacityPage() {
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

  return (
    <div className="container-page py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/account" className="text-xs text-bone-500 hover:text-bone-300">
            ← Membership
          </Link>
          <h1 className="mt-1 font-serif text-4xl font-bold text-bone">Bid Capacity</h1>
          <p className="mt-2 text-bone-400">
            Your approved capacity, deposits and guarantees — what you can bid against.
          </p>
        </div>
        <Link
          href="/account/security"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-bone-300 hover:border-white/20"
        >
          Account security
        </Link>
      </div>

      {loading || (token && !member && !error) ? (
        <div className="mt-8 grid gap-6">
          <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          <div className="h-40 animate-pulse rounded-xl bg-white/5" />
        </div>
      ) : !token ? (
        <Card className="mt-8">
          <p className="text-bone-400">Sign in to see your Bid Capacity.</p>
          <Link href="/login?next=/account/bid-capacity" className="mt-4 inline-block">
            <span className="rounded-md border border-amber-300/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/10">
              Sign in
            </span>
          </Link>
        </Card>
      ) : error ? (
        <Card className="mt-8">
          <p className="text-bone-400">
            We couldn’t load your Bid Capacity just now. Please retry.
          </p>
        </Card>
      ) : member ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-bone">Current capacity</h2>
                {member.bidCapacity.hasFacility ? (
                  <span className="text-xs text-bone-500">Updated live</span>
                ) : (
                  <span className="text-xs text-bone-500">No facility yet</span>
                )}
              </div>
              {member.bidCapacity.hasFacility ? (
                <div className="mt-4">
                  <BidCapacityMeter capacity={member.bidCapacity} live />
                </div>
              ) : (
                <p className="mt-3 text-sm text-bone-400">
                  You don’t have an approved bid capacity yet. Add verified security below to bid on
                  credit — cash bidders can still take part where a sale allows it.
                </p>
              )}
            </Card>

            <Card>
              <h2 className="font-display text-sm font-semibold text-bone">
                Security &amp; deposits
              </h2>
              <div className="mt-4">
                <SecurityCards security={member.security} />
              </div>
            </Card>

            <RequestCapacity member={member} />
          </div>

          <div className="flex flex-col gap-6">
            <CreditPolicyNote currency={member.bidCapacity.currency} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * How to add or review security. Customer self-service submission is not yet a
 * backend capability, so this is an honest "how to" rather than a fake form: it
 * routes to the Singha desk / support with the member's Client ID to hand.
 */
function RequestCapacity({ member }: { member: MemberSelf }) {
  const ref = member.clientReference ?? 'your Client ID';
  return (
    <Card>
      <h2 className="font-display text-sm font-semibold text-bone">Add or review security</h2>
      <p className="mt-2 text-sm text-bone-400">
        To lodge a cash deposit or a bank guarantee, or to have your capacity reviewed, contact the
        Singha desk with {ref} to hand. Verified security is applied by Singha after checks.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={`mailto:members@singha.lk?subject=${encodeURIComponent(
            `Bid capacity request · ${member.clientReference ?? ''}`,
          )}`}
          className="rounded-md border border-amber-300/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
        >
          Request a review
        </a>
        <Link
          href="/how-it-works"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-bone-300 hover:border-white/20"
        >
          How membership works
        </Link>
      </div>
      {member.bidCapacity.hasFacility ? (
        <p className="mt-3 text-xs text-bone-500">
          Approved {formatMoney(member.bidCapacity.approvedMinor, member.bidCapacity.currency)} ·
          Available {formatMoney(member.bidCapacity.availableMinor, member.bidCapacity.currency)}.
        </p>
      ) : null}
    </Card>
  );
}
