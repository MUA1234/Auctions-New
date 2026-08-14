// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// vitest has no global afterEach here, so unmount between tests to keep the jsdom
// document isolated (otherwise multiple reels accumulate).
afterEach(cleanup);
import { FeaturedReel } from './FeaturedReel';
import type { CatalogueCardV2 } from '../lib/api';

// next/link → a plain anchor so the reel can render without the app-router context.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function item(i: number): CatalogueCardV2 {
  return {
    id: `lot-${i}`,
    reference: `LOT-${i}`,
    title: `Featured Lot ${i}`,
    category: 'vehicles',
    saleMethod: 'TIMED_AUCTION',
    status: 'live',
    featured: true,
    watchers: 0,
    media: { videoAvailable: false },
    commercial: {
      kind: 'auction',
      currency: 'LKR',
      openingBidMinor: 100000,
      currentBidMinor: 250000,
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      extendedCount: 0,
    },
  };
}
const items = [item(0), item(1), item(2), item(3)];

describe('FeaturedReel (pack doc 09)', () => {
  it('shows the first lot as the active heading and links it to its lot page', () => {
    render(<FeaturedReel items={items} />);
    expect(screen.getByRole('heading', { name: 'Featured Lot 0' })).toBeDefined();
    // Every lot is clickable — the active card links to its lot detail.
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/lot/lot-0');
  });

  it('advances with the Next control', () => {
    render(<FeaturedReel items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next featured lot' }));
    expect(screen.getByRole('heading', { name: 'Featured Lot 1' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Featured Lot 0' })).toBeNull();
  });

  it('advances with the ArrowRight key', () => {
    render(<FeaturedReel items={items} />);
    fireEvent.keyDown(screen.getByRole('group', { name: 'Featured lots' }), { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Featured Lot 1' })).toBeDefined();
  });

  it('jumps to a lot via its pager dot and marks it current', () => {
    render(<FeaturedReel items={items} />);
    const dot = screen.getByRole('button', { name: 'Show featured lot 3' });
    fireEvent.click(dot);
    expect(screen.getByRole('heading', { name: 'Featured Lot 2' })).toBeDefined();
    expect(dot.getAttribute('aria-current')).toBe('true');
  });

  it('renders a single lot with no pager controls', () => {
    render(<FeaturedReel items={[item(0)]} />);
    expect(screen.queryByRole('button', { name: 'Next featured lot' })).toBeNull();
  });
});
