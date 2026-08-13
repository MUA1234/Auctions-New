'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import { useAuth } from '../../../lib/auth';
import {
  enrollTotp,
  getAal,
  listFactors,
  unenrollFactor,
  verifyTotp,
  type AalStatus,
  type MfaFactor,
  type TotpEnrollment,
} from '../../../lib/mfa';

/**
 * Account security (pack doc 09 "MFA privileged staff"). Enroll and manage TOTP
 * factors on a real Supabase session. Enrollment shows a QR code + manual secret
 * once; a correct code verifies the factor and lifts the session to AAL2.
 * Privileged staff surfaces (see MfaGate) require a verified factor here.
 */
export default function SecurityPage() {
  const { user, token, loading } = useAuth();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [aal, setAal] = useState<AalStatus | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isReal = !!user;

  const refresh = useCallback(async () => {
    try {
      const [f, a] = await Promise.all([listFactors(), getAal()]);
      setFactors(f);
      setAal(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (token && isReal) void refresh();
  }, [token, isReal, refresh]);

  if (!loading && !token) {
    return (
      <Shell>
        <p className="text-sm text-bone-400">Sign in to manage your account security.</p>
        <Link href="/login?next=/account/security" className="mt-4 inline-block">
          <Button variant="gold">Sign in</Button>
        </Link>
      </Shell>
    );
  }

  if (token && !isReal) {
    return (
      <Shell>
        <p className="text-sm text-bone-400">
          You’re signed in with a development session. MFA is managed on real Supabase accounts —
          sign in with email to enroll an authenticator.
        </p>
      </Shell>
    );
  }

  async function startEnroll() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setEnrollment(await enrollTotp());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e: FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotp(enrollment.factorId, code);
      setEnrollment(null);
      setCode('');
      setNotice('Authenticator verified. Your account is now protected by MFA.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await unenrollFactor(id);
      await refresh();
      setNotice('Authenticator removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const verified = factors.filter((f) => f.status === 'verified');

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="text-sm text-bone-400">Multi-factor authentication</span>
        {aal?.current === 'aal2' ? (
          <Chip>Active · AAL2</Chip>
        ) : verified.length > 0 ? (
          <Chip>Enrolled</Chip>
        ) : (
          <Chip>Not set up</Chip>
        )}
      </div>

      {notice && <p className="mt-4 text-sm text-[#5fd0a3]">{notice}</p>}
      {error && <p className="mt-4 text-sm text-outbid">{error}</p>}

      {/* Enrolled factors */}
      {verified.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {verified.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
            >
              <div>
                <p className="text-sm text-bone">{f.friendlyName ?? 'Authenticator app'}</p>
                <p className="text-xs text-bone-500">Time-based one-time code (TOTP)</p>
              </div>
              <button
                onClick={() => remove(f.id)}
                disabled={busy}
                className="text-xs text-outbid hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment flow */}
      {enrollment ? (
        <form onSubmit={confirmEnroll} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-bone-300">
            Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy),
            then enter the 6-digit code to finish.
          </p>
          {/* Supabase returns an SVG data-URI — no external library needed. */}
          <img
            src={enrollment.qrCode}
            alt="MFA QR code"
            className="h-44 w-44 rounded-lg bg-white p-2"
          />
          <p className="text-xs text-bone-500">
            Can’t scan? Enter this key manually:{' '}
            <code className="tabular text-bone-300">{enrollment.secret}</code>
          </p>
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
          <div className="flex gap-3">
            <Button type="submit" variant="gold" disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify & activate'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEnrollment(null);
                setCode('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <Button
            variant={verified.length > 0 ? 'outline' : 'gold'}
            onClick={startEnroll}
            disabled={busy}
          >
            {verified.length > 0 ? 'Add another authenticator' : 'Set up authenticator app'}
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">Account security</h1>
      <p className="mt-2 text-bone-400">
        Protect your account — required for seller and staff tools.
      </p>
      <Card className="mt-8 max-w-lg">{children}</Card>
    </div>
  );
}
