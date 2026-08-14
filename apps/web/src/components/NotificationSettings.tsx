'use client';

import Link from 'next/link';
import { Button } from '@singha/ui';
import { useAuth } from '../lib/auth';
import { useFlags } from '../lib/use-flags';
import { SignInPrompt } from './SignInPrompt';
import { NotificationPreferences } from './NotificationPreferences';

/**
 * Notification settings surface, gated on `engagementV3` (pack doc 05). With the flag OFF
 * it shows a safe fallback rather than a half-built surface; signed-out users get the
 * standard sign-in gate.
 */
export function NotificationSettings() {
  const { flags, loading } = useFlags();
  const { token, loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return <p className="py-16 text-center text-bone-500">Loading…</p>;
  }
  if (!flags.engagementV3) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="font-serif text-2xl font-bold text-bone">Notifications are coming soon</h1>
        <p className="max-w-md text-bone-400">
          Fine-grained notification controls are on their way.
        </p>
        <Link href="/account">
          <Button variant="gold">Back to account</Button>
        </Link>
      </div>
    );
  }
  if (!token) {
    return (
      <SignInPrompt
        title="Manage your notifications"
        description="Sign in to choose which updates you get, on which channels, and when."
        next="/account/notifications"
      />
    );
  }
  return <NotificationPreferences />;
}
