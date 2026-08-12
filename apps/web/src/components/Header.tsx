import Link from 'next/link';
import { Logo } from '@singha/ui';
import { AuthNav, SellCta } from './AuthNav';

const NAV = [
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/live', label: 'Live' },
  { href: '/how-it-works', label: 'How it works' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-coal-950/70 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link
          href="/"
          aria-label="Singha Auctions home"
          className="transition-opacity hover:opacity-90"
        >
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-bone-300 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative py-1 transition-colors hover:text-bone"
            >
              {item.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-gold-400/80 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <AuthNav />
          <SellCta />
        </div>
      </div>
    </header>
  );
}
