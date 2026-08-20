// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CommercialOfferForm } from './CommercialOfferForm';
import { submitCommercialOffer } from '../../lib/evolution-api';

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: 'tok', user: null, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  submitCommercialOffer: vi.fn(),
  fxConvert: vi.fn(),
}));
// fx display off so <Price> on the confirmation screen stays native-only.
vi.mock('../../lib/use-flags', () => ({ useFlags: () => ({ flags: {}, loading: false }) }));

const mockSubmit = submitCommercialOffer as unknown as Mock;

/** Fill the offer form with a currency + major-unit amount and submit it. */
async function submitOffer(currency: string, typedAmount: string) {
  render(<CommercialOfferForm listingId="listing-1" />);
  fireEvent.change(screen.getByLabelText('Currency'), { target: { value: currency } });
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: typedAmount } });
  fireEvent.click(screen.getByRole('button', { name: /Submit offer/i }));
  await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  return mockSubmit.mock.calls[0]![0] as {
    proposal: { currency: string; totalPriceMinor: number };
  };
}

beforeEach(() => {
  mockSubmit.mockReset();
  mockSubmit.mockImplementation(async (body: { proposal: { totalPriceMinor: number } }) => ({
    id: 'offer-1',
    amountMinor: body.proposal.totalPriceMinor,
    currency: 'LKR',
    sealed: false,
    status: 'SUBMITTED',
  }));
});
afterEach(cleanup);

describe('CommercialOfferForm — the offer amount honours the selected currency exponent', () => {
  it('submits a ¥5,000 JPY offer as totalPriceMinor 5000 (exponent 0, not ×100)', async () => {
    const body = await submitOffer('JPY', '5000');
    expect(body.proposal.currency).toBe('JPY');
    expect(body.proposal.totalPriceMinor).toBe(5_000);
  });

  it('submits a $12.34 USD offer as totalPriceMinor 1234 (exponent 2)', async () => {
    const body = await submitOffer('USD', '12.34');
    expect(body.proposal.currency).toBe('USD');
    expect(body.proposal.totalPriceMinor).toBe(1_234);
  });
});
