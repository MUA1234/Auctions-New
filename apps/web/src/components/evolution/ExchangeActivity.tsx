'use client';
import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip, Skeleton, Stat } from '@singha/ui';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import { humanize } from '../../lib/format';
import { type EvoDashboard, type StatusCount, fetchEvoDashboard } from '../../lib/evolution-api';

/**
 * Cross-domain customer command centre (E11 dashboard). A single read-only view of everything the
 * customer is buying, selling and verifying across Singha, assembled from the authoritative
 * `/dashboard` projection. Every metric links back to the surface that owns it — this page never
 * mutates state, it only reflects and routes.
 */

function StatusBreakdown({ items }: { items: StatusCount[] }) {
  if (!items || items.length === 0)
    return <p className="mt-2 text-xs text-bone-600">Nothing here yet.</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Chip key={s.status} tone="neutral">
          {humanize(s.status)} · {s.count}
        </Chip>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  breakdown,
  href,
  linkLabel,
}: {
  label: string;
  value: number;
  breakdown?: StatusCount[];
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="min-w-0">
      <Stat label={label} value={value} />
      {breakdown ? <StatusBreakdown items={breakdown} /> : null}
      {href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-xs font-medium text-gold-400 hover:text-gold-300"
        >
          {linkLabel ?? 'View'} →
        </Link>
      ) : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-xl text-bone">{title}</h2>
      <p className="mt-1 text-sm text-bone-500">{subtitle}</p>
      {empty ? (
        <p className="mt-4 text-sm text-bone-600">Nothing here yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

export function ExchangeActivity() {
  const { token, loading: authLoading } = useAuth();
  const [data, setData] = useState<EvoDashboard | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading || !token) return;
    let alive = true;
    setStatus('loading');
    fetchEvoDashboard(token)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus('idle');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [token, authLoading, reloadKey]);

  if (!authLoading && !token)
    return (
      <SignInPrompt
        title="Your exchange activity"
        description="Sign in to see your buying, selling and verification across Singha."
        next="/account/activity"
      />
    );

  return (
    <div className="container-page py-10 sm:py-14">
      <header>
        <p className="eyebrow text-gold-300">Command centre</p>
        <h1 className="mt-1 font-serif text-3xl text-bone">Your exchange activity</h1>
        <p className="mt-2 max-w-2xl text-bone-400">
          Everything you&rsquo;re buying, selling and verifying across Singha — in one place.
        </p>
      </header>

      {status === 'loading' ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-none" />
          ))}
        </div>
      ) : status === 'error' ? (
        <Card className="mt-8 py-10 text-center">
          <p className="text-bone-300">We couldn&rsquo;t load your activity.</p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      ) : data ? (
        <div className="mt-8 space-y-10">
          <Section
            title="Buying"
            subtitle="Lots you're watching and the offers and requests you've made."
            empty={
              data.buying.watching === 0 &&
              data.buying.offers.total === 0 &&
              data.buying.procurementRequests.total === 0
            }
          >
            <Metric label="Watching" value={data.buying.watching} />
            <Metric
              label="Offers"
              value={data.buying.offers.total}
              breakdown={data.buying.offers.byStatus}
              href="/account/commercial-offers"
              linkLabel="View offers"
            />
            <Metric
              label="Procurement requests"
              value={data.buying.procurementRequests.total}
              breakdown={data.buying.procurementRequests.byStatus}
              href="/wanted/procurement"
              linkLabel="View requests"
            />
          </Section>

          <Section
            title="Selling"
            subtitle="Your supply programmes and the proposals you've submitted."
            empty={
              data.selling.supplyProgrammes.total === 0 &&
              data.selling.procurementResponses.total === 0
            }
          >
            <Metric
              label="Supply programmes"
              value={data.selling.supplyProgrammes.total}
              breakdown={data.selling.supplyProgrammes.byStatus}
              href="/sell/supply"
              linkLabel="Manage supply"
            />
            <Metric
              label="Proposals submitted"
              value={data.selling.procurementResponses.total}
              breakdown={data.selling.procurementResponses.byStatus}
            />
          </Section>

          <Section
            title="Verification"
            subtitle="Capabilities that unlock bidding, selling and cross-border trade."
            empty={data.verification.total === 0}
          >
            <Metric
              label="Capabilities"
              value={data.verification.total}
              breakdown={data.verification.byStatus}
              href="/account/singha-id"
              linkLabel="Manage Singha ID"
            />
          </Section>
        </div>
      ) : null}
    </div>
  );
}
