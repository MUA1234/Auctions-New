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

afterEach(cleanup);

describe('HeroShowcase 3D revolving reel', () => {
  it('shows both featured lots and the editorial notes', () => {
    const { container } = render(<HeroShowcase items={[lot('1', '2018 Toyota Prado')]} />);
    expect(container.textContent).toContain('Every bid validated, sequenced and recorded'); // note
    expect(container.textContent).toContain('2018 Toyota Prado'); // featured lot
  });

  it('duplicates the set for a seamless loop, with the duplicate hidden from assistive tech', () => {
    const { container } = render(<HeroShowcase items={[]} />);
    const occurrences = (container.textContent?.match(/Server-authoritative/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2); // set rendered at least twice
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull(); // duplicate is hidden
  });
});
