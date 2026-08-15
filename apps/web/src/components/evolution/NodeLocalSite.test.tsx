// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({
  fetchNode: vi.fn(),
  fetchNodeDiscovery: vi.fn(),
}));

// The public local-site reads its node code from the route params.
vi.mock('next/navigation', () => ({ useParams: () => ({ code: 'LK' }) }));
// next/link → a plain anchor so cards render without the app-router context.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: null, user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({ flags: { satelliteNodes: true }, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchNode: h.fetchNode,
  fetchNodeDiscovery: h.fetchNodeDiscovery,
}));
vi.mock('../../components/MfaGate', () => ({
  MfaGate: ({ children }: { children: ReactNode }) => children,
}));

import { NodeLocalSite } from './NodeLocalSite';

afterEach(cleanup);

describe('NodeLocalSite (E13 public local market)', () => {
  it('renders the node name and its central inventory attributed to the node', async () => {
    h.fetchNode.mockResolvedValue({
      code: 'LK',
      name: 'Singha Colombo',
      mode: 'full_market',
      verification: 'verified',
      presets: { currency: 'LKR', language: 'en', country: 'LK', marketId: 'm1' },
      capabilities: {
        browse: true,
        originateListings: true,
        takeOffers: true,
        runAuctions: true,
        acceptPayments: true,
      },
    });
    h.fetchNodeDiscovery.mockResolvedValue({
      nodeCode: 'LK',
      mode: 'full_market',
      presets: { currency: 'LKR', language: 'en', country: 'LK' },
      source: 'central',
      count: 1,
      listings: [{ id: 'lot-501', publicRef: 'LOT-501', title: 'Teak dining suite' }],
    });

    render(<NodeLocalSite />);

    // The node name is the hero heading.
    expect(await screen.findByRole('heading', { name: 'Singha Colombo' })).toBeTruthy();
    // The discovered listing renders...
    expect(await screen.findByText('Teak dining suite')).toBeTruthy();
    // ...and links to its central lot page by id.
    const link = await screen.findByRole('link', { name: /Teak dining suite/ });
    expect(link.getAttribute('href')).toBe('/lot/lot-501');
  });
});
