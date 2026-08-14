// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GestureBidControl } from './GestureBidControl';
import { placeBid, type AuctionState } from '../lib/api';

vi.mock('../lib/api', () => ({ placeBid: vi.fn() }));
const mockPlaceBid = placeBid as unknown as Mock;

const state: AuctionState = {
  id: 'auc-1',
  listingId: 'lot-1',
  status: 'open',
  currency: 'LKR',
  openingBidMinor: 100_000,
  incrementMinor: 5_000,
  currentBidMinor: 200_000,
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 3_600_000).toISOString(),
  extendedCount: 0,
  bidCount: 1,
  version: 1,
};

function renderControl(onPlaced = vi.fn()) {
  render(<GestureBidControl auctionId="auc-1" state={state} token="tok" onPlaced={onPlaced} />);
  return onPlaced;
}

beforeEach(() => {
  localStorage.clear();
  mockPlaceBid.mockReset();
  mockPlaceBid.mockResolvedValue({ youLead: true });
});
afterEach(cleanup);

describe('GestureBidControl (pack doc 12)', () => {
  it('requires a first-use binding acknowledgement before the first bid', async () => {
    const onPlaced = renderControl();
    // Keyboard is the accessible equivalent of the swipe.
    fireEvent.keyDown(screen.getByRole('button', { name: /Swipe to bid/i }), { key: 'Enter' });

    // Acknowledgement is shown; nothing is submitted yet.
    expect(screen.getByText(/binding bid/i)).toBeDefined();
    expect(mockPlaceBid).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /I understand/i }));
    await waitFor(() => expect(mockPlaceBid).toHaveBeenCalledTimes(1));

    // Bids the exact next increment (200,000 + 5,000) with an idempotency key.
    const [auctionId, body] = mockPlaceBid.mock.calls[0];
    expect(auctionId).toBe('auc-1');
    expect(body.maxAmountMinor).toBe(205_000);
    expect(typeof body.idempotencyKey).toBe('string');
    expect(body.idempotencyKey.length).toBeGreaterThan(0);
    expect(onPlaced).toHaveBeenCalledTimes(1);
  });

  it('bids directly once the acknowledgement has been given', async () => {
    localStorage.setItem('singha_gesture_ack', '1');
    renderControl();
    fireEvent.keyDown(screen.getByRole('button', { name: /Swipe to bid/i }), { key: 'Enter' });
    await waitFor(() => expect(mockPlaceBid).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/binding bid/i)).toBeNull();
  });

  it('shows the exact next-bid amount', () => {
    localStorage.setItem('singha_gesture_ack', '1');
    renderControl();
    expect(screen.getByText('LKR 2,050')).toBeDefined();
  });
});
