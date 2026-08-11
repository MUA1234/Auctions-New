'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip } from '@singha/ui';
import {
  apiGetAuthed,
  apiPost,
  fetchMyWatch,
  type MyEoi,
  type MyOffer,
  type WatchedLot,
} from '../../lib/api';
import { formatMoney } from '../../lib/format';

const TOKEN_KEY = 'singha_demo_token';

/**
 * Buyer command-centre (docs/13 "Buyer dashboard"): watchlist + the buyer's own
 * EOIs and offers, behind the demo login. Personal data is fetched client-side
 * with the bearer token — the server enforces that you only see your own.
 */
export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eois, setEois] = useState<MyEoi[]>([]);
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [watchlist, setWatchlist] = useState<WatchedLot[]>([]);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
  }, []);

  const load = useCallback(async (t: string) => {
    setError(null);
    try {
      const [e, o, w] = await Promise.all([
        apiGetAuthed<MyEoi[]>('/eoi/mine', t).catch(() => []),
        apiGetAuthed<MyOffer[]>('/exchange/offers/mine', t).catch(() => []),
        fetchMyWatch(t).catch(() => []),
      ]);
      setEois(e);
      setOffers(o);
      setWatchlist(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost<{ token: string }>('/auth/demo', { email });
      localStorage.setItem(TOKEN_KEY, r.token);
      setToken(r.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setEois([]);
    setOffers([]);
  }

  if (!token) {
    return (
      <div className="container-page py-16">
        <h1 className="font-serif text-4xl font-bold text-bone">Buyer dashboard</h1>
        <Card className="mt-8 max-w-md">
          <form onSubmit={login} className="flex flex-col gap-3">
            <p className="text-sm text-bone-400">Sign in with your email (demo login).</p>
            <input
              className="field"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
            <Button type="submit" variant="gold" disabled={busy}>
              Continue
            </Button>
            {error && <p className="text-sm text-outbid">{error}</p>}
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-bone">Your command centre</h1>
        <button onClick={signOut} className="text-sm text-bone-400 hover:text-bone-200">
          Sign out
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Watching" value={watchlist.length} />
        <Stat label="Expressions of interest" value={eois.length} />
        <Stat label="Offers" value={offers.length} />
      </div>

      <Section title="Watchlist">
        {watchlist.length === 0 ? (
          <Empty>
            No saved lots yet. Open a lot and tap “Watch”, then it appears here.{' '}
            <Link href="/catalogue" className="text-gold-400">
              Browse the catalogue →
            </Link>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {watchlist.map((lot) => (
              <Link key={lot.listingId} href={`/lot/${lot.listingId}`}>
                <Card className="flex flex-col gap-2 transition-colors hover:border-red-500/30">
                  <Chip>{lot.saleMethod.replace(/_/g, ' ')}</Chip>
                  <h3 className="font-display text-sm font-semibold text-bone">{lot.title}</h3>
                  <span className="tabular font-display text-base font-bold text-gold-400">
                    {lot.currentBidMinor != null
                      ? formatMoney(lot.currentBidMinor, lot.currency)
                      : lot.status}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Your expressions of interest">
        {eois.length === 0 ? (
          <Empty>No EOIs submitted.</Empty>
        ) : (
          <Rows>
            {eois.map((e) => (
              <RowLine
                key={e.id}
                left={`Listing ${e.listingId.slice(-6)}`}
                mid={formatMoney(e.amountMinor, e.currency)}
                status={e.status}
              />
            ))}
          </Rows>
        )}
      </Section>

      <Section title="Your offers">
        {offers.length === 0 ? (
          <Empty>No offers made.</Empty>
        ) : (
          <Rows>
            {offers.map((o) => (
              <RowLine
                key={o.id}
                left={`Listing ${o.listingId.slice(-6)}`}
                mid={formatMoney(o.amountMinor, o.currency)}
                status={o.status}
              />
            ))}
          </Rows>
        )}
      </Section>

      {error && <p className="mt-6 text-sm text-outbid">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="tabular font-display text-3xl font-bold text-bone">{value}</span>
      <span className="text-xs uppercase tracking-wide text-bone-500">{label}</span>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-serif text-xl font-bold text-bone">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-sm text-bone-400">{children}</p>
    </Card>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-white/10">{children}</div>;
}

function RowLine({ left, mid, status }: { left: string; mid: string; status: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 last:border-0">
      <span className="text-sm text-bone-200">{left}</span>
      <span className="tabular text-sm text-gold-400">{mid}</span>
      <Chip>{status.replace(/_/g, ' ')}</Chip>
    </div>
  );
}
