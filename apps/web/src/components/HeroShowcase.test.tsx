// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { HeroShowcase } from './HeroShowcase';
import type { CatalogueCardV2 } from '../lib/api';

// Reduced motion → the rAF revolve is skipped, so the render is deterministic.
vi.mock('@singha/auctionflow', () => ({ useReducedMotion: () => true }));

function lot(id: string, title: string): CatalogueCardV2 {
  return {
    id,
    reference: `LOT-${id}`,
    title,
    category: 'vehicles',
    saleMethod: 'TIMED_AUCTION',
    status: 'live',
    featured: true,
    watchers: 0,
    media: { videoAvailable: false },
    commercial: {
      kind: 'auction',
      currency: 'LKR',
      openingBidMinor: 1,
      currentBidMinor: 100_000,
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      extendedCount: 0,
    },
  } as unknown as CatalogueCardV2;
}

const news = [
  { eyebrow: 'Market Pulse', text: '42 lots sold in the last 30 days' },
  { eyebrow: 'Total cleared', text: 'LKR 1.2B across recent sales' },
];

afterEach(cleanup);

describe('HeroShowcase 3D revolving reel', () => {
  it('mixes featured lots with Market Pulse news', () => {
    const { container } = render(
      <HeroShowcase items={[lot('1', '2018 Toyota Prado')]} news={news} />,
    );
    expect(container.textContent).toContain('2018 Toyota Prado'); // featured lot
    expect(container.textContent).toContain('42 lots sold in the last 30 days'); // pulse news
  });

  it('duplicates the set for a seamless loop, with the duplicate hidden from assistive tech', () => {
    const { container } = render(<HeroShowcase items={[]} news={news} />);
    const occurrences = (container.textContent?.match(/42 lots sold/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2); // set rendered at least twice
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
