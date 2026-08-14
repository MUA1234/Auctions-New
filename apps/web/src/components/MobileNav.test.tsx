// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  flags: { discoverV3: false } as Record<string, boolean>,
  auth: { token: null as string | null, user: null as { name?: string } | null, loading: false },
  pathname: '/',
}));

vi.mock('next/navigation', () => ({ usePathname: () => h.pathname }));
vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));
vi.mock('../lib/auth', () => ({ useAuth: () => h.auth, signOut: vi.fn() }));

import { MobileNav } from './MobileNav';

beforeEach(() => {
  h.flags = { discoverV3: false };
  h.auth = { token: null, user: null, loading: false };
  h.pathname = '/';
});
afterEach(cleanup);

describe('MobileNav (V3-1 shell — mobile navigation drawer)', () => {
  it('opens a focus-trapped dialog with the full nav when the hamburger is tapped', async () => {
    render(<MobileNav />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: /main menu/i });
    expect(dialog).toBeTruthy();
    // Every primary nav item is reachable on mobile.
    for (const label of ['Catalogue', 'Events', 'Dashboard', 'Live', 'How it works']) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: /sell with singha/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows the Discover entry only when discoverV3 is enabled', async () => {
    h.flags = { discoverV3: true };
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('link', { name: 'Discover' })).toBeTruthy();
  });

  it('closes when a nav link is tapped', async () => {
    render(<MobileNav />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('link', { name: 'Catalogue' }));
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
  });

  it('closes on Escape', async () => {
    render(<MobileNav />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
  });

  it('shows account actions when signed in', async () => {
    h.auth = { token: 'tok', user: { name: 'Priya' }, loading: false };
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    await screen.findByRole('dialog');
    expect(screen.getByText('Priya')).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
  });
});
