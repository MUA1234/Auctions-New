// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  token: 'tok' as string | null,
  fetchMine: vi.fn(),
  create: vi.fn(),
  setStatus: vi.fn(),
  attach: vi.fn(),
  fetchDetail: vi.fn(),
  fetchPerishableSummary: vi.fn(),
}));

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
  fetchMySupplyProgrammes: h.fetchMine,
  createSupplyProgramme: h.create,
  setSupplyProgrammeStatus: h.setStatus,
  attachPerishable: h.attach,
  // Read-only "View programme terms" disclosure (CX6) — lazy, fetched only if a test opens it.
  fetchSupplyProgramme: h.fetchDetail,
  fetchPerishable: h.fetchPerishableSummary,
}));

import { SupplyProgrammes } from './SupplyProgrammes';

beforeEach(() => {
  h.token = 'tok';
  h.fetchMine
    .mockReset()
    .mockResolvedValue([
      { id: 'sp-1', product: 'Ceylon Tea', category: 'Beverages', status: 'active' },
    ]);
  h.create
    .mockReset()
    .mockResolvedValue({ id: 'sp-2', product: 'Cinnamon quills', status: 'draft' });
  h.setStatus.mockReset().mockResolvedValue({ id: 'sp-1', status: 'paused' });
  h.attach
    .mockReset()
    .mockResolvedValue({ id: 'per-1', subjectType: 'supply_programme', subjectId: 'sp-1' });
  h.fetchDetail.mockReset().mockResolvedValue({
    id: 'sp-1',
    product: 'Ceylon Tea',
    category: 'Beverages',
    originCountry: 'Sri Lanka',
    availableQuantity: '500',
    minOrderQuantity: '50',
    maxOrderQuantity: '500',
    quantityUnitCode: 'kg',
    indicativePriceMinor: 150000,
    currency: 'LKR',
    frequency: 'monthly',
    leadTimeDays: 14,
    status: 'active',
  });
  h.fetchPerishableSummary
    .mockReset()
    .mockRejectedValue(new Error('GET /supply/perishable -> 404'));
});
afterEach(cleanup);

describe('SupplyProgrammes (E10 — seller supply programmes)', () => {
  it('lists the seller’s existing programmes', async () => {
    render(<SupplyProgrammes />);
    expect(await screen.findByText('Ceylon Tea')).toBeTruthy();
  });

  it('creating a programme calls createSupplyProgramme with the product', async () => {
    render(<SupplyProgrammes />);
    await screen.findByText('Ceylon Tea');
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'Cinnamon quills' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create programme' }));
    await waitFor(() => expect(h.create).toHaveBeenCalled());
    expect(h.create.mock.calls[0]![0]).toMatchObject({ product: 'Cinnamon quills' });
  });
});
