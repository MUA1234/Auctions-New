// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MyCommercialOffers } from './MyCommercialOffers';

vi.mock('../../lib/auth', () => ({ useAuth: () => ({ token: 't', loading: false }) }));

const h = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock('../../lib/evolution-api', () => ({
  fetchMyCommercialOffers: () => Promise.resolve(h.rows),
  withdrawCommercialOffer: () => Promise.resolve(),
}));

afterEach(cleanup);

describe('MyCommercialOffers', () => {
  it('shows the real listing title/reference, never the raw listing id (CX5, pack doc 05)', async () => {
    h.rows = [
      {
        id: 'o1',
        listingId: '01RAWCUID999ZZZ',
        customerId: 'c1',
        status: 'open',
        amountMinor: 1_850_000_000,
        currency: 'LKR',
        sealed: false,
        listing: {
          title: '2021 Toyota Hilux Rocco 4x4',
          publicRef: 'EVO-VEH-1',
          saleMethod: 'MAKE_OFFER',
          location: { city: 'Colombo', region: null },
          coverStorageKey: null,
        },
      },
    ];
    const { findByText, queryByText } = render(<MyCommercialOffers />);
    // The human title renders…
    expect(await findByText('2021 Toyota Hilux Rocco 4x4')).toBeTruthy();
    // …with the public reference, and NOT the raw CUID as visible text.
    expect(await findByText(/EVO-VEH-1/)).toBeTruthy();
    expect(queryByText('01RAWCUID999ZZZ')).toBeNull();
  });
});
