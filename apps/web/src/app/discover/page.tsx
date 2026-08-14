import { DiscoverExperience } from '../../components/DiscoverExperience';

export const metadata = {
  title: 'Discover',
  description:
    'A personalised, swipeable way to find auction lots you’ll love. Swiping records a preference only — it is never a bid.',
};

/**
 * `/discover` — Singha Discover swipe deck + Buyer Twin insight (pack doc 04). The
 * route always exists (no production 404), but the experience is gated on the
 * server-controlled `discoverV3` flag inside `DiscoverExperience`; with the flag OFF
 * the page shows a safe fallback rather than a half-built surface.
 */
export default function DiscoverPage() {
  return <DiscoverExperience />;
}
