'use client';

import Link from 'next/link';
import { useFlags } from '../../lib/use-flags';

/**
 * "Ways to transact" (CX pack doc 04): a brief, editorial explainer that Singha is an
 * exchange with several sale methods — auction is one of them, not the whole identity.
 * Restrained visual treatment (a light divider grid, not six nested cards) per doc 06.
 *
 * Gated on `neutralIaV1` (controlled preview).
 */
const METHODS: Array<{ title: string; blurb: string; href: string; cta: string }> = [
  {
    title: 'Buy Now',
    blurb: 'Fixed-price assets and commodities ready to purchase immediately.',
    href: '/catalogue',
    cta: 'Browse Buy Now',
  },
  {
    title: 'Make Offer',
    blurb: 'Open a commercial negotiation on price, quantity, delivery and terms.',
    href: '/exchange',
    cta: 'How offers work',
  },
  {
    title: 'Timed Auction',
    blurb: 'Compete over a set window; the auction engine is the single source of truth.',
    href: '/catalogue',
    cta: 'See live lots',
  },
  {
    title: 'Live Auction',
    blurb: 'Multi-camera broadcast with online, floor and phone bidding on one ledger.',
    href: '/live',
    cta: 'Enter live room',
  },
  {
    title: 'Sealed Tender',
    blurb: 'Confidential proposals compared on full commercial merit — never just price.',
    href: '/exchange',
    cta: 'About tenders',
  },
  {
    title: 'Request Supply',
    blurb: 'Post recurring or one-off demand and let verified suppliers respond.',
    href: '/wanted',
    cta: 'Post what you need',
  },
];

export function HomeWaysToTransact() {
  const { flags } = useFlags();
  if (!flags.neutralIaV1) return null;

  return (
    <section className="border-t border-white/[0.07]">
      <div className="container-wide py-20">
        <p className="eyebrow">One exchange, many ways to deal</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-bold tracking-tight text-bone sm:text-4xl">
          Ways to transact
        </h2>
        <p className="mt-3 max-w-2xl text-bone-400">
          Auction is one method, not the whole story. Choose how you buy, sell or source — every
          route runs on the same server-authoritative, auditable records.
        </p>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {METHODS.map((m) => (
            <div key={m.title} className="border-t border-white/10 pt-5">
              <h3 className="font-display text-lg font-semibold text-bone">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone-400">{m.blurb}</p>
              <Link
                href={m.href}
                className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-300 transition-colors hover:text-gold-200"
              >
                {m.cta}
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
