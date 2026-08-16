// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

const h = vi.hoisted(() => ({
  token: 'tok' as string | null,
  fetchEvoDashboard: vi.fn(),
  fetchCapabilities: vi.fn(),
  fetchDashboard: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: h.token, user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({ flags: { singhaId: true, dashboard: true }, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchEvoDashboard: h.fetchEvoDashboard,
  fetchCapabilities: h.fetchCapabilities,
}));
// CX7: the Command Centre also consumes the buyer command-centre projection (pack doc 05) for
// per-lot attention detail (outbid / payment due / ready for pickup / closing soon).
vi.mock('../../lib/api', () => ({
  fetchDashboard: h.fetchDashboard,
}));

import { ExchangeActivity } from './ExchangeActivity';

const dashboard = () => ({
  buying: {
    watching: 5,
    offers: {
      total: 3,
      byStatus: [
        { status: 'pending', count: 2 },
        { status: 'accepted', count: 1 },
      ],
    },
    procurementRequests: { total: 2, byStatus: [{ status: 'open', count: 2 }] },
  },
  selling: {
    supplyProgrammes: { total: 4, byStatus: [{ status: 'active', count: 4 }] },
    procurementResponses: { total: 6, byStatus: [{ status: 'submitted', count: 6 }] },
  },
  verification: { total: 7, byStatus: [{ status: 'verified', count: 7 }] },
});

beforeEach(() => {
  h.token = 'tok';
  h.fetchEvoDashboard.mockReset().mockResolvedValue(dashboard());
  // Neither the buyer projection nor capability grants are required for the page to render —
  // both default to their "unavailable" shape so every test opts in only to what it needs.
  h.fetchCapabilities.mockReset().mockResolvedValue([]);
  h.fetchDashboard.mockReset().mockResolvedValue(null);
});
afterEach(cleanup);

describe('ExchangeActivity (E11 dashboard / CX7 Command Centre)', () => {
  it('renders the buying, selling, wanted and documents numbers from the dashboard', async () => {
    render(<ExchangeActivity />);
    // Lane headings (CX7 recompose: Buying · Selling · Wanted · Documents; Logistics only
    // appears once the buyer command-centre projection is available).
    expect(await screen.findByText('Buying')).toBeTruthy();
    expect(screen.getByText('Selling')).toBeTruthy();
    expect(screen.getByText('Wanted')).toBeTruthy();
    expect(screen.getByText('Documents')).toBeTruthy();
    // Distinct Stat totals across every lane.
    expect(screen.getByText('5')).toBeTruthy(); // watching
    expect(screen.getByText('3')).toBeTruthy(); // offers total
    expect(screen.getByText('2')).toBeTruthy(); // procurement requests total (Wanted lane)
    expect(screen.getByText('4')).toBeTruthy(); // supply programmes total
    expect(screen.getByText('6')).toBeTruthy(); // proposals sent total (Wanted lane)
    expect(screen.getByText('7')).toBeTruthy(); // verification total (Documents lane fallback)
  });

  it('shows a calm "all caught up" message when nothing needs action', async () => {
    render(<ExchangeActivity />);
    expect(await screen.findByText('Needs your attention')).toBeTruthy();
    expect(screen.getByText(/all caught up/i)).toBeTruthy();
  });

  it('surfaces "Needs your attention" items derived from the dashboard/activity read-models', async () => {
    // A counter-offer awaiting response (E4 status vocabulary already used by StatusChip/
    // MyCommercialOffers's WITHDRAWABLE set).
    h.fetchEvoDashboard.mockResolvedValue({
      ...dashboard(),
      buying: {
        ...dashboard().buying,
        offers: { total: 1, byStatus: [{ status: 'countered', count: 1 }] },
      },
    });
    // Outbid / payment due / ready for pickup from the buyer command-centre strip (pack doc 05
    // — the same typed fields `/dashboard` already renders as its top action strip).
    h.fetchDashboard.mockResolvedValue({
      strip: {
        activeBids: 1,
        winning: 0,
        outbid: 1,
        paymentDueMinor: 500000,
        readyForPickup: 1,
        currency: 'LKR',
      },
      groups: [],
    });
    // A capability grant needing action (customer-safe status, never a raw risk score).
    h.fetchCapabilities.mockResolvedValue([
      { capability: 'sell', status: 'rejected', expiresAt: null },
    ]);

    render(<ExchangeActivity />);

    const heading = await screen.findByRole('heading', { name: 'Needs your attention' });
    const section = heading.closest('section');
    expect(section).toBeTruthy();
    const attention = within(section as HTMLElement);

    expect(attention.getByText(/counter-offer to respond to/i)).toBeTruthy();
    expect(attention.getByText(/outbid on 1 lot/i)).toBeTruthy();
    expect(attention.getByText(/Payment due/i)).toBeTruthy();
    expect(attention.getByText(/ready for collection/i)).toBeTruthy();
    expect(attention.getByText(/verification item needs action/i)).toBeTruthy();
    // The friendly capability label is named — never the raw `sell` enum code.
    expect(attention.getByText(/Selling/)).toBeTruthy();

    // Every attention card is a real link (keyboard-reachable), routing to where it's resolved.
    expect(attention.getAllByRole('link').length).toBeGreaterThanOrEqual(5);
  });
});
