'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFlags } from '../../lib/use-flags';

/**
 * Intent-first hero affordance (CX pack doc 04): a real search plus a compact row of
 * customer intents — Sell / Post what I need / Opportunities — so the homepage leads with
 * "what do you want to do", not a wall of feature cards. Search deep-links into Explore
 * (`/catalogue?q=`), which reads the `q` param into its server-side keyword filter.
 *
 * Gated on `neutralIaV1` so it appears in the controlled preview (`?evo=on`) and leaves the
 * current production hero untouched until the neutral IA is switched on.
 */
const INTENTS: Array<{ href: string; label: string }> = [
  { href: '/sell', label: 'Sell something' },
  { href: '/wanted', label: 'Post what I need' },
  { href: '/exchange', label: 'View opportunities' },
];

export function HomeSearchIntent() {
  const { flags } = useFlags();
  const router = useRouter();
  const [q, setQ] = useState('');

  if (!flags.neutralIaV1) return null;

  return (
    <div className="mt-8 max-w-xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const term = q.trim();
          router.push(term ? `/catalogue?q=${encodeURIComponent(term)}` : '/catalogue');
        }}
        className="flex items-center gap-2 rounded-2xl border border-white/15 bg-coal-950/70 p-1.5 backdrop-blur-md focus-within:border-gold-400/50"
      >
        <label htmlFor="home-search" className="sr-only">
          Search assets and commodities
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="ml-2 h-5 w-5 shrink-0 text-bone-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" strokeLinecap="round" />
        </svg>
        <input
          id="home-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vehicles, gems, machinery, property, produce…"
          className="w-full bg-transparent py-2 text-sm text-bone placeholder:text-bone-500 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          Search
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-bone-400">
        <span className="text-bone-500">I want to</span>
        {INTENTS.map((it, i) => (
          <span key={it.href} className="flex items-center gap-2">
            {i > 0 && <span className="text-bone-700">·</span>}
            <Link
              href={it.href}
              className="font-medium text-gold-300 underline-offset-4 transition-colors hover:text-gold-200 hover:underline"
            >
              {it.label}
            </Link>
          </span>
        ))}
      </div>
    </div>
  );
}
