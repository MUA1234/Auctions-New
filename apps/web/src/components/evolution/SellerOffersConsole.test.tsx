// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({
  fetchListing: vi.fn(),
  reveal: vi.fn(),
  award: vi.fn(),
}));

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
  fetchOffersForListing: h.fetchListing,
  revealSealedOffers: h.reveal,
  awardSealedOffer: h.award,
}));

import { SellerOffersConsole } from './SellerOffersConsole';

const REVEALED = {
  listingId: 'lst-1',
  sealed: true,
  revealed: true,
  offers: [
    { rank: 1, offerId: 'off-1', amountMinor: 30000000, currency: 'LKR', revisionNumber: 2 },
    { rank: 2, offerId: 'off-2', amountMinor: 20000000, currency: 'LKR' },
  ],
};

beforeEach(() => {
  h.fetchListing.mockReset();
  h.reveal.mockReset().mockResolvedValue(REVEALED);
  h.award.mockReset().mockResolvedValue({ awarded: true });
});
afterEach(cleanup);

describe('SellerOffersConsole (E4 sealed offers)', () => {
  it('hides amounts pre-reveal and shows participation + a Reveal button', async () => {
    h.fetchListing.mockResolvedValue({
      listingId: 'lst-1',
      sealed: true,
      revealed: false,
      participants: 4,
      offersReceived: 3,
    });
    render(<SellerOffersConsole listingId="lst-1" />);

    expect(await screen.findByText('Reveal sealed offers')).toBeTruthy();
    // participation counts are shown…
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/audited and cannot be undone/i)).toBeTruthy();
    // …but no amounts and no award controls before the seller reveals.
    expect(screen.queryByText(/LKR/)).toBeNull();
    expect(screen.queryByText('Award')).toBeNull();
  });

  it('reveals amounts and awards the row the seller confirms', async () => {
    h.fetchListing.mockResolvedValue({
      listingId: 'lst-1',
      sealed: true,
      revealed: false,
      participants: 2,
      offersReceived: 2,
    });
    render(<SellerOffersConsole listingId="lst-1" />);

    fireEvent.click(await screen.findByText('Reveal sealed offers'));

    // Amounts appear only after reveal.
    expect(await screen.findByText('LKR 300,000')).toBeTruthy();
    expect(screen.getByText('LKR 200,000')).toBeTruthy();

    // Two rows, each with its own Award button — nothing auto-selected (rule D4).
    const awardButtons = screen.getAllByText('Award');
    expect(awardButtons.length).toBe(2);
    expect(h.award).not.toHaveBeenCalled();

    // Awarding requires an explicit inline confirmation.
    fireEvent.click(awardButtons[0]!);
    fireEvent.click(screen.getByText('Confirm award'));

    await waitFor(() => expect(h.award).toHaveBeenCalled());
    expect(h.award.mock.calls[0]![0]).toBe('lst-1');
    expect(h.award.mock.calls[0]![1]).toBe('off-1');
    expect(h.award.mock.calls[0]![2]).toBe('tok');
  });
});
