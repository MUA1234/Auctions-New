'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@singha/ui';
import { fetchDashboard, type DashboardStrip } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { formatMoney } from '../../lib/format';

type Item = { label: string; value: string; tone: 'gold' | 'win' | 'outbid' | 'bone' };

/** Build the customer-safe attention items — only the ones that actually need attention. */
function itemsFor(s: DashboardStrip): Item[] {
  const out: Item[] = [];
  if (s.outbid > 0) out.push({ label: 'Outbid', value: String(s.outbid), tone: 'outbid' });
  if (s.winning > 0) out.push({ label: 'Winning', value: String(s.winning), tone: 'win' });
  if (s.activeBids > 0)
    out.push({ label: 'Active bids', value: String(s.activeBids), tone: 'gold' });
  if (s.paymentDueMinor > 0)
    out.push({
      label: 'Payment due',
      value: formatMoney(s.paymentDueMinor, s.currency),
      tone: 'gold',
    });
  if (s.readyForPickup > 0)
    out.push({ label: 'Ready for pickup', value: String(s.readyForPickup), tone: 'bone' });
  return out;
}

const TONE: Record<Item['tone'], string> = {
  gold: 'text-gold-400',
  win: 'text-[#5fd0a3]',
  outbid: 'text-outbid',
  bone: 'text-bone-200',
};

/**
 * §23 (RW7) — the signed-in "attention" home rail. A rebuildable read model (the dashboard
 * projection), never customer truth. It renders ONLY when the viewer is signed in AND actually has
 * something needing attention — a signed-out or all-quiet viewer sees nothing, so the homepage stays
 * editorial + lightweight (rule 13).
 */
export function HomeAttentionRail() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const dash = await fetchDashboard(token);
      if (!alive || !dash) return;
      const next = itemsFor(dash.strip);
      if (next.length > 0) setItems(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!items) return null;

  return (
    <section className="container-wide pt-10">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-bone-500">
            Needs your attention
          </span>
          {items.map((it) => (
            <span key={it.label} className="flex items-baseline gap-2">
              <span className={`tabular font-display text-xl font-bold ${TONE[it.tone]}`}>
                {it.value}
              </span>
              <span className="text-sm text-bone-400">{it.label}</span>
            </span>
          ))}
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 text-sm font-semibold text-red-400 hover:text-red-300"
        >
          Go to your dashboard →
        </Link>
      </Card>
    </section>
  );
}
