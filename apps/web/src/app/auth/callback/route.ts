import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

/**
 * OAuth / magic-link / email-confirmation callback (pack doc 09). Exchanges the
 * one-time code for a secure cookie session, then redirects to `next`. Sessions
 * are cookie-based and refreshed by the middleware — no tokens in localStorage.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL('/login?error=auth', url.origin));
}
