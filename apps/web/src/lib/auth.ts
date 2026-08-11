'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';

const DEMO_KEY = 'singha_demo_token';

/**
 * Demo/dev auth path. On by default for local dev; MUST be disabled in
 * production by setting NEXT_PUBLIC_DEMO_AUTH_ENABLED=false (pack doc 09
 * "Dev/demo auth endpoints must be disabled in production").
 */
export const demoAuthEnabled = process.env.NEXT_PUBLIC_DEMO_AUTH_ENABLED !== 'false';

export interface AuthUser {
  email: string | null;
  source: 'supabase' | 'demo';
}

/**
 * The bearer token to send to the Singha API. Prefers a real, secure Supabase
 * session (production auth, doc 09); falls back to the gated demo token only in
 * non-production. Resolves null when signed out.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch {
    /* Supabase not configured in this environment */
  }
  if (demoAuthEnabled && typeof window !== 'undefined') return localStorage.getItem(DEMO_KEY);
  return null;
}

/** Store a demo token and notify same-tab listeners (dev only). */
export function setDemoToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_KEY, token);
  window.dispatchEvent(new StorageEvent('storage', { key: DEMO_KEY, newValue: token }));
}

/** Sign out of both the real session and any demo token. */
export async function signOut() {
  try {
    await createClient().auth.signOut();
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: DEMO_KEY, newValue: null }));
  }
}

/**
 * React auth state: current token + user, reacting to Supabase auth changes and
 * demo-token changes. Used by every authed surface so no component reads the
 * demo token directly (doc 09 "Remove `singha_demo_token` dependency").
 */
export function useAuth(): { token: string | null; user: AuthUser | null; loading: boolean } {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const sync = async () => {
      let session = null;
      try {
        session = (await supabase.auth.getSession()).data.session;
      } catch {
        /* not configured */
      }
      if (!active) return;
      if (session?.access_token) {
        setToken(session.access_token);
        setUser({ email: session.user.email ?? null, source: 'supabase' });
      } else if (demoAuthEnabled) {
        const t = localStorage.getItem(DEMO_KEY);
        setToken(t);
        setUser(t ? { email: null, source: 'demo' } : null);
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };

    void sync();
    let unsub = () => {};
    try {
      const { data } = supabase.auth.onAuthStateChange(() => void sync());
      unsub = () => data.subscription.unsubscribe();
    } catch {
      /* not configured */
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_KEY) void sync();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      active = false;
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return { token, user, loading };
}
