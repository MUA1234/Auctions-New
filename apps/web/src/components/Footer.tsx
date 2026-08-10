import Link from 'next/link';
import { Logo } from '@singha/ui';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-coal-950/60">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-sm text-bone-500">
            Serious, transparent commerce for Sri Lanka — not casino-style gamification.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-bone-400">
          <Link href="/how-it-works" className="hover:text-bone">
            How it works
          </Link>
          <Link href="/catalogue" className="hover:text-bone">
            Catalogue
          </Link>
          <Link href="/sell" className="hover:text-bone">
            Sell with Singha
          </Link>
          <Link href="/terms" className="hover:text-bone">
            Terms
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/5 py-4">
        <p className="container-page text-xs text-bone-600">
          © {new Date().getFullYear()} Singha Auctions. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
