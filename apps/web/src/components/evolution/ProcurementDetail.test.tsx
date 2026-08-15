// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  token: 'tok' as string | null,
  fetchProposals: vi.fn(),
  fetchMine: vi.fn(),
  award: vi.fn(),
  close: vi.fn(),
  submit: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'req-1' }) }));
vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: h.token, user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({
    flags: { procurement: true, supplyProgrammes: true, perishableGoods: true },
    loading: false,
  }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchProcurementProposals: h.fetchProposals,
  fetchMyProcurementRequests: h.fetchMine,
  awardProcurementRequest: h.award,
  closeProcurementRequest: h.close,
  submitProcurementProposal: h.submit,
}));

import { ProcurementDetail } from './ProcurementDetail';

const proposalsView = {
  requestId: 'req-1',
  status: 'closed',
  suppliers: 3,
  pricedProposals: 2,
  ranked: [
    {
      rank: 1,
      proposalId: 'p-cheap',
      supplierCustomerId: 'sup-1',
      totalPriceMinor: 100000,
      currency: 'USD',
      incoterm: 'CIF',
    },
    {
      rank: 2,
      proposalId: 'p-second',
      supplierCustomerId: 'sup-2',
      totalPriceMinor: 150000,
      currency: 'USD',
      incoterm: 'FOB',
    },
  ],
};

beforeEach(() => {
  h.token = 'tok';
  h.fetchProposals.mockReset().mockResolvedValue(proposalsView);
  // Viewer owns req-1 (it appears in "my requests") → they may award.
  h.fetchMine
    .mockReset()
    .mockResolvedValue([
      { id: 'req-1', type: 'RFQ', status: 'closed', title: 'Need 200MT onions' },
    ]);
  h.award
    .mockReset()
    .mockResolvedValue({ requestId: 'req-1', awardedProposalId: 'p-second', status: 'awarded' });
  h.close.mockReset().mockResolvedValue({ id: 'req-1', status: 'closed' });
  h.submit.mockReset().mockResolvedValue({ id: 'pp-1', requestId: 'req-1', status: 'submitted' });
});
afterEach(cleanup);

describe('ProcurementDetail (E9 · §09/D4 — the buyer selects the winner)', () => {
  it('renders the request and its ranked proposals', async () => {
    render(<ProcurementDetail />);
    expect(await screen.findByText('Need 200MT onions')).toBeTruthy();
    // Both proposals are shown, with their incoterms.
    expect(screen.getByText('CIF')).toBeTruthy();
    expect(screen.getByText('FOB')).toBeTruthy();
    // The ranking is explicitly a recommendation, not an auto-award.
    expect(screen.getByText(/you choose the winner/i)).toBeTruthy();
  });

  it('awards the explicitly-selected proposal (not the cheapest #1) via inline confirm', async () => {
    render(<ProcurementDetail />);
    await screen.findByText('Need 200MT onions');
    // Pick the rank-2 (more expensive) proposal to prove explicit selection — never auto-awarded.
    fireEvent.click(screen.getByRole('button', { name: 'Award to rank 2' }));
    // Nothing is awarded until the explicit inline confirmation.
    expect(h.award).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm award' }));
    await waitFor(() => expect(h.award).toHaveBeenCalled());
    expect(h.award.mock.calls[0]![0]).toBe('req-1');
    expect(h.award.mock.calls[0]![1]).toBe('p-second');
  });
});
