'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useFlags } from '../lib/use-flags';

/**
 * Mobile bottom dock (CX pack doc 03) — the purpose-built mobile navigation:
 * Explore | Wanted | Sell | Activity | Account. Replaces reliance on the hamburger drawer
 * for primary intents on small screens; the drawer stays available for the long tail.
 *
 * Gated on `neutralIaV1` (controlled preview) and `md:hidden`, so it only appears for
 * small viewports under the neutral IA and never affects the current production shell.
 * While mounted it adds `has-mobile-dock` to <html> so global CSS reserves bottom padding
 * (see @singha/ui globals.css) and content never hides behind the fixed bar.
 */
type DockItem = { href: string; label: string; icon: JSX.Element; match: (p: string) => boolean };

const I = (d: string, extra?: JSX.Element) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    {extra}
  </svg>
);

const ITEMS: DockItem[] = [
  {
    href: '/catalogue',
    label: 'Explore',
    icon: I('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-3.5-3.5'),
    match: (p) => p === '/catalogue' || p.startsWith('/lot') || p === '/exchange',
  },
  {
    href: '/wanted',
    label: 'Wanted',
    icon: I('M4 10v4h3l5 4V6L7 10H4Zm12-1a4 4 0 0 1 0 6'),
    match: (p) => p.startsWith('/wanted'),
  },
  {
    href: '/sell',
    label: 'Sell',
    icon: I('M12 5v14M5 12h14'),
    match: (p) => p.startsWith('/sell'),
  },
  {
    href: '/account/activity',
    label: 'Activity',
    icon: I('M3 12h4l2 6 4-14 2 8h6'),
    match: (p) => p === '/account/activity' || p === '/dashboard',
  },
  {
    href: '/account',
    label: 'Account',
    icon: I('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0'),
    match: (p) => p === '/account' || (p.startsWith('/account') && p !== '/account/activity'),
  },
];

export function MobileBottomDock() {
  const { flags } = useFlags();
  const pathname = usePathname() ?? '/';
  const active = flags.neutralIaV1;

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add('has-mobile-dock');
    return () => root.classList.remove('has-mobile-dock');
  }, [active]);

  if (!active) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-coal-950/85 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {ITEMS.map((it) => {
          const on = it.match(pathname);
          const isSell = it.href === '/sell';
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  on ? 'text-gold-300' : 'text-bone-400 hover:text-bone-200'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center ${
                    isSell ? 'rounded-full bg-red-500/90 p-1 text-white' : ''
                  }`}
                >
                  {it.icon}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
