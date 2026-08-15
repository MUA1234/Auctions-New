// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Hoisted mock fns so the vi.mock factories below can reference them.
const h = vi.hoisted(() => ({
  fetchMine: vi.fn(),
  withdraw: vi.fn(),
}));

// next/link → a plain anchor so the table can render without the app-router context.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: 'tok', user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({ flags: { commercialOffersV2: true, fxDisplay: false }, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchMyCommercialOffers: h.fetchMine,
  withdrawCommercialOffer: h.withdraw,
}));

import { MyCommercialOffers } from './MyCommercialOffers';

const OFFERS = [
  {
    id: 'off-1',
    listingId: 'lst-1',
    customerId: 'c1',
    status: 'open',
    amountMinor: 20000000,
    currency: 'LKR',
    sealed: false,
  },
  {
    id: 'off-2',
    listingId: 'lst-2',
    customerId: 'c1',
    status: 'accepted',
    amountMinor: 5000000,
    currency: 'USD',
    sealed: true,
  },
];

beforeEach(() => {
  h.fetchMine.mockReset().mockResolvedValue(OFFERS);
  h.withdraw.mockReset().mockResolvedValue({ ...OFFERS[0], status: 'withdrawn' });
});
afterEach(cleanup);

describe('MyCommercialOffers (E4)', () => {
  it('renders the offers returned by the API', async () => {
    render(<MyCommercialOffers />);
    expect(await screen.findByText('lst-1')).toBeTruthy();
    expect(screen.getByText('lst-2')).toBeTruthy();
    // amount rendered through <Price>, plus the currency column
    expect(screen.getByText('LKR 200,000')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
    // the "Sealed" column header plus the badge on the one sealed offer
    expect(screen.getAllByText('Sealed').length).toBe(2);
  });

  it('shows Withdraw only for open offers', async () => {
    render(<MyCommercialOffers />);
    await screen.findByText('lst-1');
    expect(screen.getAllByText('Withdraw').length).toBe(1);
  });

  it('withdrawing an open offer calls withdrawCommercialOffer with its id', async () => {
    render(<MyCommercialOffers />);
    await screen.findByText('lst-1');
    fireEvent.click(screen.getByText('Withdraw'));
    await waitFor(() => expect(h.withdraw).toHaveBeenCalled());
    expect(h.withdraw.mock.calls[0]![0]).toBe('off-1');
    expect(h.withdraw.mock.calls[0]![1]).toBe('tok');
  });
});
