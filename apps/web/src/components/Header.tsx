import Link from 'next/link';
import { Button, Logo } from '@singha/ui';

const NAV = [
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/live', label: 'Live' },
  { href: '/how-it-works', label: 'How it works' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-coal-950/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="Singha Auctions home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-bone-300 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-bone">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-bone-300 hover:text-bone sm:block"
          >
            Sign in
          </Link>
          <Link href="/sell">
            <Button variant="gold">Sell with Singha</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
