'use client';

import Link from 'next/link';
import { Button } from '@singha/ui';
import { useFlags } from '../../lib/use-flags';

/**
 * "Wanted" — surfaces the buy side so Singha visibly reads as a two-sided exchange, not a
 * one-way catalogue (CX pack doc 04/05). Editorial demand examples + two clear routes:
 * post a need, or browse open requests to respond to.
 *
 * Examples are illustrative copy (no private data); live requests live behind the
 * authenticated Wanted / Procurement surfaces. Gated on `neutralIaV1` (controlled preview).
 */
const DEMAND: Array<{ need: string; detail: string }> = [
  { need: 'Red onions · 40 MT', detail: 'CIF Colombo · monthly · food-grade' },
  { need: 'Excavator · 20-ton class', detail: 'Western Province · pickup · inspected' },
  { need: 'Copper cable scrap', detail: 'Recurring supply · Millberry 99%' },
  { need: 'Ceylon cinnamon · Alba', detail: 'Export quality · FOB · 5 MT lots' },
];

export function HomeWanted() {
  const { flags } = useFlags();
  if (!flags.neutralIaV1) return null;

  return (
    <section className="border-t border-white/[0.07] bg-coal-950/40">
      <div className="container-wide grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="eyebrow">The other side of the market</p>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-bone sm:text-4xl">
            Wanted — tell the market what you need
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-bone-400">
            Singha works both ways. Post a requirement — an asset, a commodity, a recurring supply —
            and verified sellers and suppliers come to you with commercial proposals you can compare
            on more than price.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/wanted">
              <Button variant="primary">Post what you need</Button>
            </Link>
            <Link
              href="/wanted/procurement"
              className="text-sm font-medium text-gold-300 transition-colors hover:text-gold-200"
            >
              Browse open requests →
            </Link>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DEMAND.map((d) => (
            <li
              key={d.need}
              className="rounded-2xl border border-white/[0.07] bg-coal-900/40 p-5 transition-colors hover:border-gold-400/25"
            >
              <p className="font-display text-sm font-semibold text-bone">{d.need}</p>
              <p className="mt-1 text-xs leading-relaxed text-bone-500">{d.detail}</p>
              <span className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-wider text-gold-300/80">
                Open to proposals
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
