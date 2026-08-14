// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  fetchRivalry: vi.fn(),
  flags: { bidBattleV3: true },
  token: null as string | null,
}));

vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ token: h.token, user: null, loading: false }) }));
vi.mock('../lib/api', () => ({ fetchRivalry: h.fetchRivalry }));

import { BidBattle } from './BidBattle';

function view(over: Record<string, unknown> = {}) {
  return {
    auctionId: 'auc-1',
    currentHighMinor: 525000,
    nextValidBidMinor: 550000,
    gapToNextMinor: 25000,
    activeBidderCount: 3,
    totalBids: 4,
    leadChanges: 3,
    youAreLeading: false,
    leader: 'Crimson Lion',
    challenger: 'You',
    moments: [
      { kind: 'lead_taken', who: 'Crimson Lion', sequence: 4 },
      { kind: 'you_outbid', who: 'Crimson Lion', sequence: 4 },
      { kind: 'comeback', who: 'You', sequence: 3 },
    ],
    ...over,
  };
}

beforeEach(() => {
  h.flags = { bidBattleV3: true };
  h.token = null;
  h.fetchRivalry.mockReset();
});
afterEach(cleanup);

describe('BidBattle (pack doc 05)', () => {
  it('renders nothing when the bidBattleV3 flag is OFF', () => {
    h.flags = { bidBattleV3: false };
    h.fetchRivalry.mockResolvedValue(view());
    const { container } = render(<BidBattle auctionId="auc-1" />);
    expect(container.innerHTML).toBe('');
    expect(h.fetchRivalry).not.toHaveBeenCalled();
  });

  it('renders nothing until a contest exists (no bidders yet)', async () => {
    h.fetchRivalry.mockResolvedValue(view({ activeBidderCount: 0, leader: null, moments: [] }));
    const { container } = render(<BidBattle auctionId="auc-1" />);
    await waitFor(() => expect(h.fetchRivalry).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });

  it('shows the leader, the "you vs" rival, the next valid bid and recent moments', async () => {
    h.fetchRivalry.mockResolvedValue(view());
    render(<BidBattle auctionId="auc-1" currency="LKR" />);
    expect(await screen.findByText(/Crimson Lion is leading/)).toBeDefined();
    expect(screen.getByText(/You vs/)).toBeDefined();
    expect(screen.getByText(/3 bidders/)).toBeDefined();
    // Next-valid-bid is surfaced (formatMoney renders the amount).
    expect(screen.getByText(/Next bid/)).toBeDefined();
    // The outbid moment reads naturally and names the rival alias.
    expect(screen.getByText(/Crimson Lion outbid you/)).toBeDefined();
  });

  it('celebrates the viewer leading', async () => {
    h.fetchRivalry.mockResolvedValue(
      view({ youAreLeading: true, leader: 'You', challenger: 'Cobalt Falcon' }),
    );
    render(<BidBattle auctionId="auc-1" />);
    expect(await screen.findByText(/You're in the lead/)).toBeDefined();
    // The nearest challenger is named, not the viewer.
    expect(screen.getByText(/Cobalt Falcon/)).toBeDefined();
  });

  it('never renders a raw bidder id — it only shows what the safe view provides', async () => {
    h.fetchRivalry.mockResolvedValue(view());
    const { container } = render(<BidBattle auctionId="auc-1" />);
    await screen.findByText(/Crimson Lion is leading/);
    // Sanity: the component surfaces aliases/"You" only (no id-like tokens).
    expect(container.textContent).not.toMatch(/cust_|_[0-9a-f]{8}/i);
  });
});
