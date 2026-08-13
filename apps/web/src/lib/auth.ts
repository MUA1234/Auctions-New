'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';

/**
 * Real, production authentication (pack doc 09) on Supabase Auth ONLY. There is
 * no demo/dev bypass: the bearer sent to the Singha API is always a genuine,
 * short-lived Supabase access token from a secure cookie-backed session. This
 * removes the previous `singha_demo_token` localStorage path (a token in
 * localStorage is readable by any script — an XSS token-theft vector).
 */
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** The bearer token for the Singha API, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Sign out of the real session. */
export async function signOut(): Promise<void> {
  try {
    await createClient().auth.signOut();
  } catch {
    /* ignore */
  }
}

function toUser(session: {
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
} | null): AuthUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  const name = (meta.full_name ?? meta.name) as string | undefined;
  return { id: session.user.id, email: session.user.email ?? null, name: name ?? null };
}

/**
 * React auth state: current token + user, reacting live to Supabase auth
 * changes. Used by every authed surface so no component reads a token directly.
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
      setToken(session?.access_token ?? null);
      setUser(toUser(session));
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

    return () => {
      active = false;
      unsub();
    };
  }, []);

  return { token, user, loading };
}
