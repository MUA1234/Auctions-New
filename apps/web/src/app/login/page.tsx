'use client';

import { type FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Chip } from '@singha/ui';
import { createClient } from '../../utils/supabase/client';
import { apiPost } from '../../lib/api';
import { demoAuthEnabled, setDemoToken } from '../../lib/auth';

type Mode = 'signin' | 'signup' | 'magic' | 'reset';

/**
 * Production authentication (pack doc 09) on Supabase Auth: email + password,
 * passwordless magic link, sign-up and account recovery, with secure
 * cookie-based sessions handled by the SSR middleware. A demo option is offered
 * ONLY when NEXT_PUBLIC_DEMO_AUTH_ENABLED is not "false" — it must be off in
 * production.
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
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
          options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        setNotice('Check your email to confirm your account, then sign in.');
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

  async function demoLogin() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost<{ token: string }>('/auth/demo', {
        email: email || 'demo@singha.lk',
      });
      setDemoToken(r.token);
      router.push(next);
      router.refresh();
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
        <h1 className="font-serif text-4xl font-bold text-bone">
          {mode === 'signup' ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="mt-2 text-sm text-bone-400">
          Secure access to bidding, your command centre and seller tools.
        </p>

        <Card className="mt-8">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="text-sm text-bone-400">Email</label>
            <input
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
                <label className="text-sm text-bone-400">Password</label>
                <input
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </>
            )}
            <Button type="submit" variant="gold" disabled={busy}>
              {busy ? 'Please wait…' : cta}
            </Button>
            {error && <p className="text-sm text-outbid">{error}</p>}
            {notice && <p className="text-sm text-[#5fd0a3]">{notice}</p>}
          </form>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-bone-500">
            {mode !== 'signin' && (
              <button className="hover:text-bone-300" onClick={() => setMode('signin')}>
                Sign in with password
              </button>
            )}
            {mode !== 'signup' && (
              <button className="hover:text-bone-300" onClick={() => setMode('signup')}>
                Create an account
              </button>
            )}
            {mode !== 'magic' && (
              <button className="hover:text-bone-300" onClick={() => setMode('magic')}>
                Email me a magic link
              </button>
            )}
            {mode !== 'reset' && (
              <button className="hover:text-bone-300" onClick={() => setMode('reset')}>
                Forgot password?
              </button>
            )}
          </div>
        </Card>

        {demoAuthEnabled && (
          <Card className="mt-4 border-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Chip>Dev</Chip>
                <p className="mt-2 text-xs text-bone-500">
                  Demo login (disabled in production via NEXT_PUBLIC_DEMO_AUTH_ENABLED=false).
                </p>
              </div>
              <Button variant="outline" onClick={demoLogin} disabled={busy}>
                Demo sign in
              </Button>
            </div>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-bone-600">
          By continuing you agree to the Singha auction terms.{' '}
          <Link href="/" className="text-gold-500">
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
