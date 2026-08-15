// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HeroShowcase } from './HeroShowcase';
import type { CatalogueCardV2 } from '../lib/api';

// Reduced motion → the rAF crawl is skipped, so the render is deterministic.
vi.mock('@singha/auctionflow', () => ({ useReducedMotion: () => true }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('./LotImage', () => ({ LotImage: ({ alt }: { alt: string }) => <img alt={alt} /> }));

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

describe('HeroShowcase auto-scroll reel', () => {
  it('shows featured lots and editorial notes, each lot linked to its lot page', () => {
    const { container } = render(<HeroShowcase items={[lot('1', '2018 Toyota Prado')]} />);
    expect(container.textContent).toContain('Every bid validated, sequenced and recorded'); // editorial
    expect(container.textContent).toContain('2018 Toyota Prado'); // featured lot
    expect(container.querySelector('a[href="/lot/1"]')).not.toBeNull(); // lot is clickable
  });

  it('duplicates the set for a seamless loop, with the duplicate hidden from assistive tech', () => {
    const { container } = render(<HeroShowcase items={[]} />);
    // The set is rendered twice (primary + loop duplicate).
    const occurrences = (container.textContent?.match(/Server-authoritative/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
