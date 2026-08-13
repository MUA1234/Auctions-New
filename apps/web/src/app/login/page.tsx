'use client';

import { type FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card } from '@singha/ui';
import { createClient } from '../../utils/supabase/client';

type Mode = 'signin' | 'signup' | 'magic' | 'reset';

/** 0–4 password strength from length + character-class variety. */
function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
const STRENGTH = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

/**
 * Production authentication (pack doc 09) on Supabase Auth: email + password,
 * passwordless magic link, sign-up with a captured name, and account recovery —
 * all over secure, cookie-backed sessions handled by the SSR middleware. There
 * is deliberately NO demo/guest bypass.
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const strength = useMemo(() => scorePassword(password), [password]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === 'signup') {
      if (strength < 2) {
        setError('Please choose a stronger password (8+ characters, mixed case and a number).');
        return;
      }
      if (!agree) {
        setError('Please accept the auction terms to create your account.');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setNotice('Account created. Check your email to confirm it, then sign in.');
        setMode('signin');
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        setNotice('Magic link sent — check your email to finish signing in.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/account')}`,
        });
        if (error) throw error;
        setNotice('Password reset link sent — check your email.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const needsPassword = mode === 'signin' || mode === 'signup';
  const cta =
    mode === 'signin'
      ? 'Sign in'
      : mode === 'signup'
        ? 'Create account'
        : mode === 'magic'
          ? 'Send magic link'
          : 'Send reset link';

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        {/* Segmented Sign in / Create account switch */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="mx-auto mb-8 grid w-full max-w-xs grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm font-semibold">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-full py-2 transition-colors ${
                  mode === m ? 'bg-gold-500 text-coal-950' : 'text-bone-400 hover:text-bone'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        <h1 className="font-serif text-4xl font-bold text-bone">
          {mode === 'signup'
            ? 'Create your account'
            : mode === 'magic'
              ? 'Magic-link sign in'
              : mode === 'reset'
                ? 'Reset your password'
                : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-bone-400">
          Secure access to bidding, your command centre and seller tools.
        </p>

        <Card className="mt-8">
          <form onSubmit={submit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <>
                <label className="text-sm text-bone-400" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  className="field"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </>
            )}

            <label className="text-sm text-bone-400" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="field"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {needsPassword && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-bone-400" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-xs text-bone-500 hover:text-bone-300"
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="password"
                  className="field"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode === 'signup' && password.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-1.5 flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            i < strength
                              ? strength <= 1
                                ? 'bg-outbid'
                                : strength === 2
                                  ? 'bg-gold-500'
                                  : 'bg-win'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="w-16 text-right text-[11px] text-bone-500">
                      {STRENGTH[strength]}
                    </span>
                  </div>
                )}
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="self-start text-xs text-bone-500 hover:text-bone-300"
                  >
                    Forgot password?
                  </button>
                )}
              </>
            )}

            {mode === 'signup' && (
              <label className="mt-1 flex items-start gap-2.5 text-xs leading-relaxed text-bone-400">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-gold-500"
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" className="text-gold-400 hover:text-gold-300">
                    auction terms
                  </Link>{' '}
                  and understand that all bids are binding and server-authoritative.
                </span>
              </label>
            )}

            <Button type="submit" variant="gold" disabled={busy} className="mt-1">
              {busy ? 'Please wait…' : cta}
            </Button>
            {error && <p className="text-sm text-outbid">{error}</p>}
            {notice && <p className="text-sm text-win">{notice}</p>}
          </form>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-bone-500">
            {mode !== 'magic' && (
              <button className="hover:text-bone-300" onClick={() => setMode('magic')}>
                Email me a magic link instead
              </button>
            )}
            {mode !== 'signin' && (
              <button className="hover:text-bone-300" onClick={() => setMode('signin')}>
                Back to sign in
              </button>
            )}
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-bone-600">
          <span className="text-gold-500/80" aria-hidden>
            ◆
          </span>
          Protected by encrypted sessions. Every bid, payment and settlement is recorded on an
          append-only ledger.
        </div>
        <p className="mt-3 text-center text-xs text-bone-600">
          <Link href="/" className="text-gold-500 hover:text-gold-400">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-bone-500">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
