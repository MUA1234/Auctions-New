import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

const FOOTER_NAV: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Marketplace',
    links: [
      { href: '/catalogue', label: 'Catalogue' },
      { href: '/live', label: 'Singha Live' },
      { href: '/how-it-works', label: 'How it works' },
    ],
  },
  {
    heading: 'For sellers',
    links: [
      { href: '/sell', label: 'Sell with Singha' },
      { href: '/account', label: 'Membership' },
    ],
  },
  {
    heading: 'Trust',
    links: [{ href: '/terms', label: 'Terms & conditions' }],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.07] bg-coal-950/50">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <BrandLogo className="h-11 w-auto" />
          <p className="max-w-xs text-sm leading-relaxed text-bone-500">
            Sri Lanka’s trusted asset exchange. Serious commerce, beautifully presented — with a
            server-authoritative auction engine and immutable records at its core.
          </p>
        </div>
        {FOOTER_NAV.map((col) => (
          <nav key={col.heading} className="space-y-3">
            <p className="eyebrow">{col.heading}</p>
            <ul className="space-y-2 text-sm text-bone-400">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-bone">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="container-wide flex flex-col gap-2 py-5 text-xs text-bone-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Singha Auctions. All rights reserved.</p>
          <p className="text-bone-600">Transparent · timed · live · sealed</p>
        </div>
      </div>
    </footer>
  );
}
