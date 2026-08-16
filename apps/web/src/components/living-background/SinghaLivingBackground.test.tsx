// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SinghaLivingBackground } from './SinghaLivingBackground';

// Mutable flags object the mocked useFlags reads lazily (per-test reassignment works).
const h = vi.hoisted(() => ({ flags: { v3VisualArchitecture: false } as Record<string, boolean> }));
vi.mock('../../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));

afterEach(cleanup);

describe('SinghaLivingBackground (fixed cinematic hero, gated)', () => {
  it('renders nothing when v3VisualArchitecture is off (production default)', () => {
    h.flags = { v3VisualArchitecture: false };
    const { container } = render(<SinghaLivingBackground />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the fixed, self-hosted living scene when the V3 visual flag is on', () => {
    h.flags = { v3VisualArchitecture: true };
    const { container } = render(<SinghaLivingBackground />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    // Decorative only — never announced, never a tap target.
    expect(root.getAttribute('aria-hidden')).toBe('true');
    // The artwork is loaded from our OWN origin (satisfies CSP `img-src 'self'`)…
    expect(container.innerHTML).toContain('/images/singha-hero-living');
    // …and never an external hotlink.
    expect(container.innerHTML).not.toMatch(/https?:\/\//);
    // A decorative canvas layer exists for the motes (ignored by assistive tech).
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});
