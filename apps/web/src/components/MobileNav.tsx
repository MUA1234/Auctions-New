'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Sheet } from '@singha/ui';
import { BrandLogo } from './BrandLogo';
import { NAV_ITEMS } from '../lib/nav';
import { useFlags } from '../lib/use-flags';
import { signOut, useAuth } from '../lib/auth';

/**
 * Mobile navigation drawer (V3-1 shell). The desktop header nav is `hidden md:flex`,
 * so without this phones lose all top-level navigation. Renders a hamburger that opens
 * the focus-trapped `Sheet` with the full nav, flag-gated Discover, auth-aware account
 * actions and the seller CTA. Closes on route change, ESC, scrim tap or link tap.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { flags } = useFlags();
  const { token, user } = useAuth();

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    ...NAV_ITEMS,
    ...(flags.discoverV3 ? [{ href: '/discover', label: 'Discover' }] : []),
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-bone-200 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M2 4.5h14M2 9h14M2 13.5h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} label="Main menu" side="left">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <Link href="/" aria-label="Singha Auctions home" onClick={() => setOpen(false)}>
              <BrandLogo className="h-9 w-auto" />
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-bone-400 transition-colors hover:bg-white/5 hover:text-bone"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {links.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.06] text-bone'
                      : 'text-bone-300 hover:bg-white/[0.04] hover:text-bone'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.07] px-5 py-4">
            {token ? (
              <div className="flex flex-col gap-1 pb-3">
                <span className="truncate text-sm text-bone-300">
                  {user?.name ?? user?.email ?? 'My account'}
                </span>
                <div className="flex items-center gap-4 text-sm text-bone-500">
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="hover:text-bone-200"
                  >
                    Membership
                  </Link>
                  <Link
                    href="/account/security"
                    onClick={() => setOpen(false)}
                    className="hover:text-bone-200"
                  >
                    Security
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                    className="hover:text-bone-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mb-3 block text-sm font-medium text-bone-300 hover:text-bone"
              >
                Sign in
              </Link>
            )}
            <Link href="/sell" onClick={() => setOpen(false)} className="block">
              <Button variant="gold" className="w-full justify-center">
                Sell with Singha
              </Button>
            </Link>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
