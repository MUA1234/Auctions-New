'use client';

import Link from 'next/link';
import { useFlags } from '../lib/use-flags';

/**
 * The Discover primary-nav entry. Rendered ONLY when `discoverV3` is enabled
 * server-side (pack doc 04 §B "Add Discover nav entry only when the flag is
 * enabled"), so the link never appears — and never 404s a fallback — until the
 * phase gate opens. Styling mirrors the static links in `Header`.
 */
export function DiscoverNavLink() {
  const { flags } = useFlags();
  if (!flags.discoverV3) return null;
  return (
    <Link href="/discover" className="group relative py-1 transition-colors hover:text-bone">
      Discover
      <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-gold-400/80 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
