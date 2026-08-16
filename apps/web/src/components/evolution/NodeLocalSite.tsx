'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Chip, Skeleton } from '@singha/ui';
import { humanize } from '../../lib/format';
import {
  fetchNode,
  fetchNodeDiscovery,
  type NodeDiscovery,
  type NodePresentation,
} from '../../lib/evolution-api';
import { friendlyMessage } from './evo-api-error';

/**
 * Public local-site for a Satellite Market Node (E13). A marketing-style storefront for one node
 * (name + market/country/currency presets), then the SAME central inventory attributed to this
 * node — each lot links to its central `/lot/[id]` page. No records live here: "Powered by the one
 * central Singha marketplace." No MfaGate — this is a public surface.
 */
export function NodeLocalSite() {
  const params = useParams();
  const raw = params?.code;
  const code = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');

  const [node, setNode] = useState<NodePresentation | null>(null);
  const [discovery, setDiscovery] = useState<NodeDiscovery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([fetchNode(code), fetchNodeDiscovery(code)])
      .then(([n, d]) => {
        if (alive) {
          setNode(n);
          setDiscovery(d);
          setError(null);
        }
      })
      .catch((e) => alive && setError(friendlyMessage(e, 'This local market is unavailable.')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [code, reloadKey]);

  if (loading) {
    return (
      <div className="container-page py-10 sm:py-14">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="container-page py-16">
        <Card className="mx-auto max-w-lg py-12 text-center">
          <p className="font-serif text-xl text-bone-200">This local market is unavailable</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-bone-500">
            {error ?? 'We couldn’t find a local market at this address.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
            <Link href="/">
              <Button variant="ghost">Go to Singha</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const listings = discovery?.listings ?? [];
  const presetLine = [node.presets.country, node.presets.currency, node.presets.language]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="container-page py-10 sm:py-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-coal-800/70 via-coal-900/80 to-coal-950 p-8 sm:p-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl"
          aria-hidden
        />
        <p className="eyebrow text-gold-300">
          {node.presets.country ? `${node.presets.country} · ` : ''}Local market
        </p>
        <h1 className="mt-2 max-w-2xl font-serif text-4xl font-bold leading-tight text-bone sm:text-5xl">
          {node.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip tone="gold">{humanize(node.mode)}</Chip>
          {node.presets.currency ? <Chip>{node.presets.currency}</Chip> : null}
          {node.presets.language ? <Chip>{node.presets.language}</Chip> : null}
          {node.presets.country ? <Chip>{node.presets.country}</Chip> : null}
        </div>
        <p className="mt-6 max-w-xl text-sm text-bone-400">
          A local storefront for {node.name}
          {presetLine ? ` — ${presetLine}` : ''}. Every lot below is the same authoritative
          inventory, presented for this market.
        </p>
        <p className="mt-2 text-xs uppercase tracking-wide text-bone-500">
          Powered by the one central Singha marketplace.
        </p>
      </section>

      {/* Inventory */}
      <div className="mt-10 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-2xl text-bone">Available now</h2>
        <span className="shrink-0 text-sm text-bone-500">
          {listings.length} {listings.length === 1 ? 'lot' : 'lots'} · central inventory
        </span>
      </div>

      {listings.length === 0 ? (
        <Card className="mt-5 py-12 text-center">
          <p className="font-serif text-lg text-bone-200">Nothing listed for this market yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-bone-500">
            Inventory is drawn live from the central Singha marketplace and appears here for this
            local market.
          </p>
        </Card>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((lot) => (
            <Link
              key={lot.id}
              href={`/lot/${lot.id}`}
              className="group hud-cut-sm flex flex-col border border-white/[0.07] bg-gradient-to-b from-coal-800/50 to-coal-900/75 p-5 transition-colors hover:border-gold-500/40"
            >
              <div
                className="hud-cut-sm mb-4 h-32 bg-gradient-to-br from-coal-700/60 to-coal-900/80"
                aria-hidden
              />
              <p className="text-xs uppercase tracking-wide text-bone-500">{lot.publicRef}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-bone group-hover:text-gold-200">
                {lot.title ?? lot.publicRef}
              </h3>
              <span className="mt-3 text-sm text-gold-400">View lot →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
