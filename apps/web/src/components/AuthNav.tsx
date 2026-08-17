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
    return <span className="hidden h-5 w-16 animate-pulse rounded bg-white/5 lg:block" />;

  if (!token) {
    return (
      <Link
        href="/login"
        className="hidden whitespace-nowrap text-sm font-medium text-bone-300 hover:text-bone lg:block"
      >
        Sign in
      </Link>
    );
  }

  // Desktop top bar (lg+) keeps the identity + sign-out lean so the whole header row fits
  // without wrapping at every width; Membership / Security live one click away under
  // My account and remain directly in the mobile drawer (below lg).
  return (
    <div className="hidden items-center gap-4 lg:flex">
      <Link
        href="/dashboard"
        className="max-w-[8rem] truncate text-sm text-bone-300 hover:text-bone xl:max-w-[12rem]"
        title="My account"
      >
        {user?.name ?? user?.email ?? 'My account'}
      </Link>
      <button
        onClick={() => void signOut()}
        className="whitespace-nowrap text-sm font-medium text-bone-500 hover:text-bone-300"
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
      <Button variant="gold" className="whitespace-nowrap">
        Sell with Singha
      </Button>
    </Link>
  );
}
