// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SalePanel } from './SalePanel';

// A signed-in buyer so the action panel (not the sign-in gate) renders.
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ token: 'test-token', user: null, loading: false }),
}));

afterEach(cleanup);

describe('SalePanel — sale-method routing matches the backend SaleMethod enum', () => {
  it('renders the registration form for EXPRESSION_OF_INTEREST (the real enum value)', () => {
    const { getByText, queryByText } = render(
      <SalePanel
        listingId="listing-1"
        saleMethod="EXPRESSION_OF_INTEREST"
        currency="LKR"
        priceMinor={null}
      />,
    );
    // The EOI panel is reachable — buyers can actually register interest.
    expect(getByText('Register your interest')).toBeTruthy();
    expect(queryByText(/available through the Singha exchange/i)).toBeNull();
  });

  it('falls back generically for the legacy short code "EOI" (guards the exact enum)', () => {
    const { getByText, queryByText } = render(
      <SalePanel listingId="listing-1" saleMethod="EOI" currency="LKR" priceMinor={null} />,
    );
    // 'EOI' is NOT a real saleMethod the backend emits — it must not silently match again.
    expect(queryByText('Register your interest')).toBeNull();
    expect(getByText(/available through the Singha exchange/i)).toBeTruthy();
  });

  it('routes Buy Now and Make Offer to their panels', () => {
    const buy = render(
      <SalePanel listingId="l" saleMethod="BUY_NOW" currency="LKR" priceMinor={1000} />,
    );
    expect(buy.getAllByText(/buy now/i).length).toBeGreaterThan(0);
    cleanup();
    const offer = render(
      <SalePanel listingId="l" saleMethod="MAKE_OFFER" currency="LKR" priceMinor={1000} />,
    );
    expect(offer.getByText(/submit offer/i)).toBeTruthy();
  });
});
