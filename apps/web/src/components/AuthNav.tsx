'use client';

import Link from 'next/link';
import { Button } from '@singha/ui';
import { signOut, useAuth } from '../lib/auth';

/**
 * Session-aware header actions (pack doc 09). Shows Sign in when signed out, and
 * the account name/email + Sign out when a real session exists. Reacts live to
 * Supabase auth changes via `useAuth`.
 */
export function AuthNav() {
  const { token, user, loading } = useAuth();

  if (loading)
    return <span className="hidden h-5 w-16 animate-pulse rounded bg-white/5 sm:block" />;

  if (!token) {
    return (
      <Link
        href="/login"
        className="hidden text-sm font-medium text-bone-300 hover:text-bone sm:block"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="hidden items-center gap-3 sm:flex">
      <Link
        href="/dashboard"
        className="max-w-[12rem] truncate text-sm text-bone-300 hover:text-bone"
      >
        {user?.name ?? user?.email ?? 'My account'}
      </Link>
      <Link
        href="/account"
        className="text-sm text-bone-500 hover:text-bone-300"
        title="Membership"
      >
        Membership
      </Link>
      <Link
        href="/account/security"
        className="text-sm text-bone-500 hover:text-bone-300"
        title="Account security & MFA"
      >
        Security
      </Link>
      <button
        onClick={() => void signOut()}
        className="text-sm font-medium text-bone-500 hover:text-bone-300"
      >
        Sign out
      </button>
    </div>
  );
}

/** Seller CTA that becomes "Sell" once signed in. */
export function SellCta() {
  return (
    <Link href="/sell">
      <Button variant="gold">Sell with Singha</Button>
    </Link>
  );
}
