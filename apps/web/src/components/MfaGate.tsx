'use client';

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@singha/ui';
import { useAuth } from '../lib/auth';
import { firstVerifiedFactorId, getAal, verifyTotp, type AalStatus } from '../lib/mfa';

/**
 * Step-up MFA gate for privileged staff surfaces (pack doc 09, acceptance matrix
 * "privileged MFA"). Wrap any staff/admin/operations UI. Behaviour:
 *
 * - Real Supabase sessions only. Demo/dev tokens pass straight through so local
 *   work isn't blocked (doc 09 "dev auth" carve-out).
 * - If the session already satisfies MFA (AAL2, or no factor required) the
 *   children render.
 * - If a verified factor exists but the session is still AAL1, a step-up
 *   challenge is required before the children render.
 * - When `requireEnrollment` is set and the user has no verified factor, they're
 *   sent to enroll — privileged tools stay dark until MFA is configured.
 *
 * Note: this is the client half. The backend must also require the `aal2` claim
 * for privileged commands so the gate can't be bypassed by calling the API
 * directly — the UI is never the source of truth (pack rule 2).
 */
export function MfaGate({
  children,
  requireEnrollment = false,
}: {
  children: ReactNode;
  requireEnrollment?: boolean;
}) {
  const { user, token, loading } = useAuth();
  const [aal, setAal] = useState<AalStatus | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReal = user?.source === 'supabase';

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const [status, verified] = await Promise.all([getAal(), firstVerifiedFactorId()]);
      setAal(status);
      setFactorId(verified);
    } catch {
      // Supabase not configured — treat as satisfied so we never hard-block.
      setAal({ current: null, next: null, needsChallenge: false, satisfied: true });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (isReal) void refresh();
    else setChecking(false);
  }, [isReal, refresh]);

  // Not signed in, still loading, or a demo/dev session → don't gate.
  if (loading || !token || !isReal) return <>{children}</>;
  if (checking || !aal) {
    return <GateShell>Verifying your security level…</GateShell>;
  }

  // Privileged tools that mandate MFA, but the user hasn't enrolled.
  if (requireEnrollment && !factorId) {
    return (
      <GateShell>
        <p className="text-sm text-bone-300">
          Staff tools require multi-factor authentication. Set up an authenticator app to continue.
        </p>
        <Link href="/account/security" className="mt-4 inline-block">
          <Button variant="gold">Set up MFA</Button>
        </Link>
      </GateShell>
    );
  }

  // Verified factor exists but the session is AAL1 → challenge to step up.
  if (aal.needsChallenge && factorId) {
    const submit = async (e: FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        await verifyTotp(factorId, code);
        setCode('');
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setBusy(false);
      }
    };
    return (
      <GateShell>
        <p className="text-sm text-bone-300">
          Enter the 6-digit code from your authenticator app to access staff tools.
        </p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            className="field tabular tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
          {error && <p className="text-sm text-outbid">{error}</p>}
          <Button type="submit" variant="gold" disabled={busy || code.length < 6}>
            {busy ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
      </GateShell>
    );
  }

  return <>{children}</>;
}

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="container-page py-16">
      <h1 className="font-serif text-3xl font-bold text-bone">Security check</h1>
      <Card className="mt-6 max-w-md">{children}</Card>
    </div>
  );
}
