// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// Hoisted mock state so the vi.mock factories below can reference it safely.
const h = vi.hoisted(() => ({
  token: 'tok' as string | null,
  flags: { logistics: true } as Record<string, boolean>,
  fetchIncoterms: vi.fn(),
  fetchLogisticsNodes: vi.fn(),
  requestLogisticsQuote: vi.fn(),
  bookLogisticsQuote: vi.fn(),
  fetchShipment: vi.fn(),
  // Price imports this from evolution-api; provide a stub so the module resolves.
  fxConvert: vi.fn(() => Promise.resolve({ convertedMinor: 0 })),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: h.token, user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({ flags: h.flags, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchIncoterms: h.fetchIncoterms,
  fetchLogisticsNodes: h.fetchLogisticsNodes,
  requestLogisticsQuote: h.requestLogisticsQuote,
  bookLogisticsQuote: h.bookLogisticsQuote,
  fetchShipment: h.fetchShipment,
  fxConvert: h.fxConvert,
}));

// Import AFTER the mocks so the component binds to them.
import { LogisticsCentre } from './LogisticsCentre';

beforeEach(() => {
  h.token = 'tok';
  h.flags = { logistics: true };
  h.fetchIncoterms.mockReset();
  h.fetchLogisticsNodes.mockReset();
  h.fetchIncoterms.mockResolvedValue([
    {
      code: 'FOB',
      name: 'Free On Board',
      freightArranger: 'buyer',
      description: 'Buyer arranges main freight.',
    },
    {
      code: 'CIF',
      name: 'Cost, Insurance & Freight',
      freightArranger: 'seller',
      description: 'Seller pays freight and insurance to the destination port.',
    },
  ]);
  h.fetchLogisticsNodes.mockResolvedValue([
    { id: 'n1', code: 'LKCMB', name: 'Colombo', kind: 'seaport', country: 'LK' },
    { id: 'n2', code: 'AEJEA', name: 'Jebel Ali', kind: 'seaport', country: 'AE' },
  ]);
});
afterEach(cleanup);

describe('LogisticsCentre (E7 — logistics surface)', () => {
  it('renders the public Incoterms + ports reference from the API on the default tab', async () => {
    render(<LogisticsCentre />);

    // Incoterms from the mock appear in the Reference table.
    expect(await screen.findByText('FOB')).toBeTruthy();
    expect(screen.getByText('CIF')).toBeTruthy();
    expect(screen.getByText('Free On Board')).toBeTruthy();

    // The ports/hubs reference renders alongside it.
    expect(screen.getByText('Colombo')).toBeTruthy();
    expect(screen.getByText('Jebel Ali')).toBeTruthy();

    // Both public references were fetched without a token requirement.
    expect(h.fetchIncoterms).toHaveBeenCalledTimes(1);
    expect(h.fetchLogisticsNodes).toHaveBeenCalledTimes(1);
  });

  it('keeps the Incoterms reference public even when signed out', async () => {
    h.token = null;
    render(<LogisticsCentre />);
    expect(await screen.findByText('FOB')).toBeTruthy();
    expect(screen.getByText('CIF')).toBeDefined();
  });
});
