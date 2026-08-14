// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  fetchPrefs: vi.fn(),
  updatePrefs: vi.fn(),
  token: 'tok' as string | null,
}));

vi.mock('../lib/auth', () => ({ useAuth: () => ({ token: h.token, user: null, loading: false }) }));
vi.mock('../lib/api', () => ({
  fetchNotificationPreferences: h.fetchPrefs,
  updateNotificationPreferences: h.updatePrefs,
}));

import { NotificationPreferences } from './NotificationPreferences';

const prefs = (over = {}) => ({
  channels: { in_app: true, push: false, email: true, sms: false, whatsapp: false },
  engagementOptIn: false,
  quietHours: null,
  timezoneOffsetMinutes: 0,
  frequencyCapPerDay: 8,
  mutedCategories: [],
  ...over,
});

beforeEach(() => {
  h.token = 'tok';
  h.fetchPrefs.mockReset().mockResolvedValue(prefs());
  h.updatePrefs.mockReset().mockImplementation((patch) => Promise.resolve(prefs(patch)));
});
afterEach(cleanup);

describe('NotificationPreferences (pack doc 05)', () => {
  it('loads and renders the channel toggles and opt-in', async () => {
    render(<NotificationPreferences />);
    expect(await screen.findByText('Channels')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('WhatsApp')).toBeDefined();
    // Transactional messages are explained as always-on (not togglable).
    expect(screen.getByText(/always sent/i)).toBeDefined();
  });

  it('toggling engagement opt-in PUTs the change to the authoritative API', async () => {
    render(<NotificationPreferences />);
    await screen.findByText('Channels');
    fireEvent.click(screen.getByLabelText('Send me engagement notifications'));
    await waitFor(() => expect(h.updatePrefs).toHaveBeenCalled());
    expect(h.updatePrefs.mock.calls[0]![0]).toEqual({ engagementOptIn: true });
  });

  it('toggling a channel sends only that channel patch', async () => {
    render(<NotificationPreferences />);
    await screen.findByText('Channels');
    fireEvent.click(screen.getByLabelText('SMS'));
    await waitFor(() => expect(h.updatePrefs).toHaveBeenCalled());
    expect(h.updatePrefs.mock.calls[0]![0]).toEqual({ channels: { sms: true } });
  });

  it('enabling quiet hours sends a default window', async () => {
    render(<NotificationPreferences />);
    await screen.findByText('Channels');
    fireEvent.click(screen.getByLabelText('Quiet hours'));
    await waitFor(() => expect(h.updatePrefs).toHaveBeenCalled());
    expect(h.updatePrefs.mock.calls[0]![0]).toEqual({
      quietHours: { start: '22:00', end: '07:00' },
    });
  });

  it('renders the sound & haptics control', async () => {
    render(<NotificationPreferences />);
    expect(await screen.findByRole('radiogroup', { name: 'Sound and haptics' })).toBeDefined();
  });
});
