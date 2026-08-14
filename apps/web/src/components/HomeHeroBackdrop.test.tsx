// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { HomeHeroBackdrop } from './HomeHeroBackdrop';

// Mutable flags object the mocked useFlags reads lazily (per-test reassignment works).
const h = vi.hoisted(() => ({ flags: { v3VisualArchitecture: false } as Record<string, boolean> }));
vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));

afterEach(cleanup);

describe('HomeHeroBackdrop (V3 hero image, gated)', () => {
  it('renders nothing when v3VisualArchitecture is off (production default)', () => {
    h.flags = { v3VisualArchitecture: false };
    const { container } = render(<HomeHeroBackdrop />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the self-hosted image backdrop when the V3 visual flag is on', () => {
    h.flags = { v3VisualArchitecture: true };
    const { container } = render(<HomeHeroBackdrop />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    // Decorative only — never announced, never a tap target.
    expect(root.getAttribute('aria-hidden')).toBe('true');
    // The artwork is loaded from our OWN origin (satisfies CSP `img-src 'self'`)…
    expect(container.innerHTML).toContain('/images/home-hero.webp');
    // …and is never an external hotlink.
    expect(container.innerHTML).not.toMatch(/https?:\/\//);
  });
});
