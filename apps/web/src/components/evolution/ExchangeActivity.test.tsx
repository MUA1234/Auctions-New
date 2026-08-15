// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  token: 'tok' as string | null,
  fetchEvoDashboard: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: h.token, user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({ flags: { singhaId: true, dashboard: true }, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchEvoDashboard: h.fetchEvoDashboard,
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
});
afterEach(cleanup);

describe('ExchangeActivity (E11 dashboard)', () => {
  it('renders the buying, selling and verification numbers from the dashboard', async () => {
    render(<ExchangeActivity />);
    // Section headings.
    expect(await screen.findByText('Buying')).toBeTruthy();
    expect(screen.getByText('Selling')).toBeTruthy();
    expect(screen.getByText('Verification')).toBeTruthy();
    // Distinct Stat totals across all three sections.
    expect(screen.getByText('5')).toBeTruthy(); // watching
    expect(screen.getByText('3')).toBeTruthy(); // offers total
    expect(screen.getByText('2')).toBeTruthy(); // procurement requests total
    expect(screen.getByText('4')).toBeTruthy(); // supply programmes total
    expect(screen.getByText('6')).toBeTruthy(); // proposals submitted total
    expect(screen.getByText('7')).toBeTruthy(); // verification total
  });
});
