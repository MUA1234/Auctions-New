'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from './BrandLogo';
import { AuthNav, SellCta } from './AuthNav';
import { DiscoverNavLink } from './DiscoverNavLink';
import { MobileNav } from './MobileNav';
import { NAV_ITEMS } from '../lib/nav';

/**
 * Global header (V3-1 shell). Scroll-aware elevation, a responsive mobile drawer
 * (the desktop nav is `hidden md:flex`), and an active-route indicator.
 */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? 'border-white/[0.09] bg-coal-950/80 backdrop-blur-xl'
          : 'border-transparent bg-coal-950/40 backdrop-blur-md'
      }`}
    >
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Singha Auctions home"
          className="transition-opacity hover:opacity-90"
        >
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-bone-300 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative py-1 transition-colors hover:text-bone ${
                  active ? 'text-bone' : ''
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-400/80 to-transparent transition-transform duration-300 ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
          {/* Flag-gated: appears only when `discoverV3` is enabled server-side. */}
          <DiscoverNavLink />
        </nav>

        <div className="flex items-center gap-3">
          <AuthNav />
          <div className="hidden sm:block">
            <SellCta />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
