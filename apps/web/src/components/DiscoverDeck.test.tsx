// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Hoisted mock fns so the vi.mock factories below can reference them safely.
const h = vi.hoisted(() => ({
  push: vi.fn(),
  fetchDiscoverFeed: vi.fn(),
  // No narrowing impl → params stay `any[]` so `.mock.calls[n][0]` is inspectable.
  // `signal()` in the component calls this as `void recordDiscoveryEvent(...)`, so a
  // plain undefined return is fine (nothing chains off it).
  recordDiscoveryEvent: vi.fn(),
  // addWatch IS chained (`.catch`), so it must return a thenable.
  addWatch: vi.fn(() => Promise.resolve({ watching: true })),
  auth: { token: null as string | null },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// Reduced motion → synchronous card advance (no fake timers needed).
vi.mock('@singha/auctionflow', () => ({
  useReducedMotion: () => true,
  resolveAxis: (dx: number, dy: number) =>
    Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical',
}));
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ token: h.auth.token, user: null, loading: false }),
}));
vi.mock('../lib/api', () => ({
  fetchDiscoverFeed: h.fetchDiscoverFeed,
  recordDiscoveryEvent: h.recordDiscoveryEvent,
  addWatch: h.addWatch,
}));

import { DiscoverDeck } from './DiscoverDeck';

function feedItem(i: number, category = 'vehicles') {
  return {
    listingId: `lot-${i}`,
    reference: `LOT-${i}`,
    title: `Discover Lot ${i}`,
    category,
    saleMethod: 'TIMED_AUCTION',
    currency: 'LKR',
    currentBidMinor: 250000,
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    coverStorageKey: null,
    reason: i === 0 ? 'Because you follow vehicles' : null,
  };
}

/** The event body passed to the (mocked) recordDiscoveryEvent for call `n`. */
function signalBody(n = 0): { eventType: string; listingId: string } {
  return h.recordDiscoveryEvent.mock.calls[n]?.[0] as { eventType: string; listingId: string };
}

beforeEach(() => {
  h.auth.token = null;
  h.push.mockClear();
  h.recordDiscoveryEvent.mockClear();
  h.addWatch.mockClear();
  h.fetchDiscoverFeed.mockReset();
});
afterEach(cleanup);

describe('DiscoverDeck (pack doc 04 — Singha Discover)', () => {
  it('shows loading, then the first ranked lot with its reason', async () => {
    h.fetchDiscoverFeed.mockResolvedValue({ items: [feedItem(0), feedItem(1)] });
    render(<DiscoverDeck />);
    expect(screen.getByRole('status')).toBeDefined(); // Loading…
    expect(await screen.findByRole('heading', { name: 'Discover Lot 0' })).toBeDefined();
    expect(screen.getByText(/Because you follow vehicles/)).toBeDefined();
  });

  it('"Interested" records a preference signal and advances — and never bids', async () => {
    h.fetchDiscoverFeed.mockResolvedValue({ items: [feedItem(0), feedItem(1)] });
    render(<DiscoverDeck />);
    await screen.findByRole('heading', { name: 'Discover Lot 0' });

    fireEvent.click(screen.getByRole('button', { name: 'Interested' }));

    // A signal was recorded (anonymous → LIKE), and it is NOT a bid/purchase.
    expect(h.recordDiscoveryEvent).toHaveBeenCalledTimes(1);
    expect(signalBody().eventType).toBe('LIKE');
    expect(signalBody().listingId).toBe('lot-0');
    // Anonymous session → no watch write, no navigation.
    expect(h.addWatch).not.toHaveBeenCalled();
    expect(h.push).not.toHaveBeenCalled();
    // Advanced to the next card.
    expect(await screen.findByRole('heading', { name: 'Discover Lot 1' })).toBeDefined();
  });

  it('"Not interested" records a DISLIKE and advances', async () => {
    h.fetchDiscoverFeed.mockResolvedValue({ items: [feedItem(0), feedItem(1)] });
    render(<DiscoverDeck />);
    await screen.findByRole('heading', { name: 'Discover Lot 0' });

    fireEvent.click(screen.getByRole('button', { name: 'Not interested' }));
    expect(signalBody().eventType).toBe('DISLIKE');
    expect(await screen.findByRole('heading', { name: 'Discover Lot 1' })).toBeDefined();
  });

  it('for a signed-in user, Interested watches the lot via the authoritative endpoint', async () => {
    h.auth.token = 'real-token';
    h.fetchDiscoverFeed.mockResolvedValue({ items: [feedItem(0)] });
    render(<DiscoverDeck />);
    await screen.findByRole('heading', { name: 'Discover Lot 0' });

    fireEvent.click(screen.getByRole('button', { name: 'Interested' }));
    expect(h.addWatch).toHaveBeenCalledWith('lot-0', 'real-token');
    expect(signalBody().eventType).toBe('WATCH');
  });

  it('"View lot" opens the lot detail (never a bind) and records an OPEN signal', async () => {
    h.fetchDiscoverFeed.mockResolvedValue({ items: [feedItem(0)] });
    render(<DiscoverDeck />);
    await screen.findByRole('heading', { name: 'Discover Lot 0' });

    fireEvent.click(screen.getByRole('button', { name: 'View lot' }));
    expect(h.push).toHaveBeenCalledWith('/lot/lot-0');
    expect(signalBody().eventType).toBe('OPEN');
  });

  it('surfaces an explicit error + retry when the feed fails (not a silent empty)', async () => {
    h.fetchDiscoverFeed.mockRejectedValueOnce(new Error('network'));
    render(<DiscoverDeck />);
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText(/Discover is unavailable/)).toBeDefined();

    // Retry re-fetches; this time it succeeds.
    h.fetchDiscoverFeed.mockResolvedValueOnce({ items: [feedItem(0)] });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Discover Lot 0' })).toBeDefined();
  });

  it('shows an end-of-feed state once every lot is decided', async () => {
    h.fetchDiscoverFeed.mockResolvedValue({ items: [feedItem(0)] });
    render(<DiscoverDeck />);
    await screen.findByRole('heading', { name: 'Discover Lot 0' });
    fireEvent.click(screen.getByRole('button', { name: 'Not interested' }));
    await waitFor(() => expect(screen.getByText(/You.re all caught up/)).toBeDefined());
  });
});
