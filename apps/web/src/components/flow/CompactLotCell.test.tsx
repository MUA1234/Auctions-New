// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../../lib/media', () => ({ coverUrl: () => null }));

import { CompactLotCell } from './CompactLotCell';
import type { CatalogueCardV2 } from '../../lib/api';

function lot(overrides: Record<string, unknown> = {}): CatalogueCardV2 {
  return {
    id: 'lot-1',
    title: 'Toyota Hiace 2016',
    category: 'vehicles',
    reference: 'REF-1',
    saleMethod: 'TIMED_AUCTION',
    status: 'open',
    featured: false,
    watchers: 3,
    media: { videoAvailable: false },
    commercial: {
      kind: 'auction',
      currency: 'LKR',
      currentBidMinor: 1_250_000_000,
      openingBidMinor: 1_000_000_000,
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      extendedCount: 0,
    },
    ...overrides,
  } as unknown as CatalogueCardV2;
}

afterEach(cleanup);

describe('CompactLotCell (V3 Flow — legible compact cell)', () => {
  it('links to the lot detail and shows the price and watched count', () => {
    render(<CompactLotCell lot={lot()} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/lot/lot-1');
    expect(screen.getByText(/LKR 12,500,000/)).toBeTruthy();
    expect(screen.getByText(/♥ 3/)).toBeTruthy();
  });

  it('is a single tap target with an accessible label — never a binding bid button in a cell', () => {
    render(<CompactLotCell lot={lot()} />);
    expect(screen.getByLabelText(/Toyota Hiace 2016 — Bid LKR 12,500,000/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
