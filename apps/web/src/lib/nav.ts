export type NavItem = { href: string; label: string };

/** Primary top-level navigation, shared by the desktop header and the mobile drawer. */
export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/events', label: 'Events' },
  { href: '/cockpit', label: 'Cockpit' },
  { href: '/live', label: 'Live' },
  { href: '/how-it-works', label: 'How it works' },
];

/**
 * Geography-neutral IA (Singha Evolution E1, pack docs 04/11). Gated behind `neutralIaV1`
 * (`?evo=on`) until the commerce surfaces it points at are built. "Auction" is deliberately
 * absent as a top-level concept — it is one sale method reachable through Explore/Exchange —
 * while Dashboard/Live/Events stay reachable via the account menu, the home page and each
 * Exchange surface.
 */
export const NEUTRAL_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/catalogue', label: 'Explore' },
  { href: '/exchange', label: 'Exchange' },
  { href: '/sell', label: 'Sell' },
  { href: '/wanted', label: 'Wanted' },
  { href: '/services', label: 'Services' },
];
