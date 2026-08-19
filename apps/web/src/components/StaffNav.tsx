'use client';

import Link from 'next/link';

/**
 * Staff workspace navigation — the operational surfaces (Approvals, Members / Customer 360, Agent
 * Inbox). Each destination enforces its own permission server-side; this is only wayfinding.
 */
export function StaffNav({ active }: { active?: string }) {
  const links = [
    { href: '/admin', label: 'Approvals' },
    { href: '/admin/members', label: 'Members / Customer 360' },
    { href: '/admin/inbox', label: 'Agent Inbox' },
  ];
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md border px-3 py-1.5 transition-colors ${
            active === l.href
              ? 'border-amber-300/40 text-amber-100'
              : 'border-white/10 text-bone-300 hover:border-amber-300/30 hover:text-bone'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
