// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BidPanel } from './BidPanel';
import { apiGet, placeBid, type AuctionState } from '../lib/api';

vi.mock('../lib/api', () => ({
  apiBase: 'http://api.test',
  apiGet: vi.fn(),
  placeBid: vi.fn(),
}));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ token: 'tok', user: null, loading: false }) }));
// Gesture bid and fx display off — this test is only about the typed maximum.
vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: {}, loading: false }) }));

const mockPlaceBid = placeBid as unknown as Mock;
const mockApiGet = apiGet as unknown as Mock;

function auction(overrides: Partial<AuctionState>): AuctionState {
  return {
    id: 'auc-1',
    listingId: 'lot-1',
    status: 'open',
    currency: 'LKR',
    openingBidMinor: 100_000,
    incrementMinor: 5_000,
    currentBidMinor: null,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    extendedCount: 0,
    bidCount: 0,
    version: 1,
    ...overrides,
  };
}

async function submitBid(state: AuctionState, typed: string) {
  render(<BidPanel auctionId={state.id} initial={state} lotId="lot-1" />);
  const input = screen.getByLabelText(`Your maximum bid (${state.currency})`) as HTMLInputElement;
  fireEvent.change(input, { target: { value: typed } });
  fireEvent.click(screen.getByRole('button', { name: /Place bid/i }));
  await waitFor(() => expect(mockPlaceBid).toHaveBeenCalledTimes(1));
  return { input, body: mockPlaceBid.mock.calls[0]![1] as { maxAmountMinor: number } };
}

beforeEach(() => {
  mockPlaceBid.mockReset();
  mockPlaceBid.mockResolvedValue({ youLead: true });
  mockApiGet.mockReset();
});
afterEach(cleanup);

describe('BidPanel — the typed maximum honours the auction currency exponent', () => {
  it('submits a ¥5,000 JPY bid as 5000 minor units (exponent 0, not ×100)', async () => {
    const state = auction({
      currency: 'JPY',
      openingBidMinor: 4_000,
      incrementMinor: 1_000,
      currentBidMinor: 4_000,
    });
    mockApiGet.mockResolvedValue(state);

    const { input, body } = await submitBid(state, '5000');
    expect(body.maxAmountMinor).toBe(5_000);

    // JPY has no minor unit: min/step/placeholder are whole yen, never ¥50.00.
    expect(input.min).toBe('5000');
    expect(input.step).toBe('1000');
    expect(input.placeholder).toBe('5000');
  });

  it('submits a $12.34 USD bid as 1234 minor units (exponent 2)', async () => {
    const state = auction({
      currency: 'USD',
      openingBidMinor: 1_000,
      incrementMinor: 34,
      currentBidMinor: 1_200,
    });
    mockApiGet.mockResolvedValue(state);

    const { input, body } = await submitBid(state, '12.34');
    expect(body.maxAmountMinor).toBe(1_234);
    expect(input.min).toBe('12.34');
    expect(input.step).toBe('0.34');
    expect(input.placeholder).toBe('12.34');
  });
});
