// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  flags: { aiConversation: true, neutralIaV1: false } as Record<string, boolean>,
  auth: { token: null as string | null, user: null as { name?: string } | null, loading: false },
  assistant: {
    open: false,
    seed: {} as { listingId?: string; url?: string },
    openAssistant: vi.fn(),
    close: vi.fn(),
  },
  pathname: '/',
}));

vi.mock('../../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));
vi.mock('../../lib/auth', () => ({ useAuth: () => h.auth }));
vi.mock('./AssistantProvider', () => ({ useAssistant: () => h.assistant }));
vi.mock('next/navigation', () => ({ usePathname: () => h.pathname }));
vi.mock('../../lib/assistant-api', () => ({
  askAssistant: vi.fn(),
  assistantChannelRequest: vi.fn(),
  getAssistantConversation: vi.fn().mockResolvedValue(null),
}));

import { SinghaAssistant } from './SinghaAssistant';

beforeEach(() => {
  h.flags = { aiConversation: true, neutralIaV1: false };
  h.auth = { token: null, user: null, loading: false };
  h.assistant = { open: false, seed: {}, openAssistant: vi.fn(), close: vi.fn() };
  h.pathname = '/';
  localStorage.clear();
});
afterEach(cleanup);

describe('SinghaAssistant (AIC-5)', () => {
  it('renders nothing at all when aiConversation is off', () => {
    h.flags = { ...h.flags, aiConversation: false };
    const { container } = render(<SinghaAssistant />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the floating launcher when aiConversation is on', () => {
    render(<SinghaAssistant />);
    expect(screen.getByRole('button', { name: /ask singha ai/i })).toBeTruthy();
  });

  it('hides the launcher and opens the panel once the assistant is open', async () => {
    h.assistant = { ...h.assistant, open: true };
    render(<SinghaAssistant />);
    // The launcher toggles off while the panel is open (the panel itself has the close control).
    expect(screen.queryByRole('button', { name: /^ask singha ai$/i })).toBeNull();
    expect(await screen.findByRole('dialog', { name: /ask singha/i })).toBeTruthy();
  });

  it('signed-out: opening the panel shows the sign-in gate, not the message input', async () => {
    h.assistant = { ...h.assistant, open: true };
    h.auth = { token: null, user: null, loading: false };
    render(<SinghaAssistant />);

    expect(await screen.findByText('Sign in to chat with Singha AI')).toBeTruthy();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toBeTruthy();
    expect(screen.queryByLabelText('Message Singha AI')).toBeNull();
  });

  it('signed-in: opening the panel shows the message input, not the sign-in gate', async () => {
    h.assistant = { ...h.assistant, open: true };
    h.auth = { token: 'tok', user: { name: 'Priya' }, loading: false };
    render(<SinghaAssistant />);

    expect(await screen.findByLabelText('Message Singha AI')).toBeTruthy();
    expect(screen.queryByText('Sign in to chat with Singha AI')).toBeNull();
    // The channel-choice row is present but WhatsApp/Call are disabled with no conversation yet.
    expect(screen.getByText('Chat now')).toBeTruthy();
    const whatsapp = screen.getByRole('button', { name: 'WhatsApp' }) as HTMLButtonElement;
    expect(whatsapp.disabled).toBe(true);
  });

  it('the sign-in link points back to the current page', async () => {
    h.assistant = { ...h.assistant, open: true };
    h.pathname = '/lot/lot-42';
    render(<SinghaAssistant />);
    const link = (await screen.findByRole('link', {
      name: /^sign in$/i,
    })) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/login?next=%2Flot%2Flot-42');
  });
});
