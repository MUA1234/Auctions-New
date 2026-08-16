// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { LotLogisticsHint } from './LotLogisticsHint';

const h = vi.hoisted(() => ({ flags: { logistics: false } as Record<string, boolean> }));
vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));

afterEach(cleanup);

describe('LotLogisticsHint (CX8 — collection/delivery affordance)', () => {
  it('renders nothing when there is no pickup line and the logistics flag is off', () => {
    h.flags = { logistics: false };
    const { container } = render(<LotLogisticsHint collectionSummary={null} place="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the collectionSummary verbatim when the backend has one', () => {
    h.flags = { logistics: false };
    const { getByText } = render(
      <LotLogisticsHint collectionSummary="Colombo warehouse · weekdays 9–5" place="Colombo" />,
    );
    expect(getByText(/Colombo warehouse · weekdays 9–5/)).toBeTruthy();
  });

  it('falls back to a location-based pickup line when collectionSummary is absent', () => {
    h.flags = { logistics: false };
    const { getByText } = render(
      <LotLogisticsHint collectionSummary={null} place="Colombo, Western" />,
    );
    expect(getByText(/Collection can be arranged in/)).toBeTruthy();
    expect(getByText('Colombo, Western')).toBeTruthy();
  });

  it('never fabricates a pickup line when neither collectionSummary nor location exist', () => {
    h.flags = { logistics: true };
    const { queryByText } = render(<LotLogisticsHint collectionSummary={null} place="" />);
    expect(queryByText(/Pickup/)).toBeNull();
    expect(queryByText(/Collection can be arranged/)).toBeNull();
  });

  it('shows the delivery-estimate link into /services/logistics only when the logistics flag is on', () => {
    h.flags = { logistics: false };
    const off = render(<LotLogisticsHint collectionSummary="Colombo warehouse" place="Colombo" />);
    expect(off.queryByText('Get a delivery estimate')).toBeNull();
    cleanup();

    h.flags = { logistics: true };
    const on = render(<LotLogisticsHint collectionSummary="Colombo warehouse" place="Colombo" />);
    const link = on.getByText('Get a delivery estimate').closest('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/services/logistics');
    // Plain link, never a pre-filled deep link — neither the destination page nor
    // LogisticsCentre reads query params today.
    expect(link?.getAttribute('href')).not.toContain('?');
  });
});
