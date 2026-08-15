// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  token: 'tok' as string | null,
  fetchSinghaProfile: vi.fn(),
  updateSinghaProfile: vi.fn(),
  fetchCapabilities: vi.fn(),
  requestCapability: vi.fn(),
  evaluateCapability: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ token: h.token, user: null, loading: false }),
}));
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({ flags: { singhaId: true, dashboard: true }, loading: false }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchSinghaProfile: h.fetchSinghaProfile,
  updateSinghaProfile: h.updateSinghaProfile,
  fetchCapabilities: h.fetchCapabilities,
  requestCapability: h.requestCapability,
  evaluateCapability: h.evaluateCapability,
}));

import { SinghaIdProfile } from './SinghaIdProfile';

const profile = () => ({
  customerId: 'cus_1',
  countryResidency: 'LK',
  displayCurrency: 'LKR',
  language: 'en',
  timezone: 'Asia/Colombo',
  companyRoles: ['buyer', 'seller'],
  notificationPrefs: {},
});

beforeEach(() => {
  h.token = 'tok';
  h.fetchSinghaProfile.mockReset().mockResolvedValue(profile());
  h.updateSinghaProfile.mockReset().mockResolvedValue({ customerId: 'cus_1', updated: true });
  h.fetchCapabilities.mockReset().mockResolvedValue([
    { capability: 'place_bid', status: 'verified', expiresAt: '2027-01-01T00:00:00.000Z' },
    { capability: 'sell', status: 'pending', expiresAt: null },
  ]);
  h.requestCapability.mockReset().mockResolvedValue({ capability: 'export', status: 'pending' });
  h.evaluateCapability.mockReset().mockResolvedValue({
    activity: 'place_bid',
    requiredCapability: 'place_bid',
    permitted: true,
    status: 'verified',
    reason: 'ok',
  });
});
afterEach(cleanup);

describe('SinghaIdProfile (E11 Singha ID)', () => {
  it('loads and shows the profile and capabilities', async () => {
    render(<SinghaIdProfile />);
    // Profile fields render from the loaded profile.
    expect(await screen.findByDisplayValue('Asia/Colombo')).toBeTruthy();
    expect(screen.getByDisplayValue('buyer, seller')).toBeTruthy();
    // Every capability is listed by name (also offered in the request Select);
    // the verified grant shows its status via StatusChip.
    expect(screen.getAllByText('Place bid').length).toBeGreaterThan(0);
    expect(screen.getByText('verified')).toBeTruthy();
  });

  it('requesting a capability calls requestCapability with the chosen capability', async () => {
    render(<SinghaIdProfile />);
    await screen.findByDisplayValue('Asia/Colombo');

    fireEvent.change(screen.getByLabelText('Request a capability'), {
      target: { value: 'export' },
    });
    fireEvent.click(screen.getByRole('button', { name: /request verification/i }));

    await waitFor(() => expect(h.requestCapability).toHaveBeenCalled());
    expect(h.requestCapability.mock.calls[0]![0]).toBe('export');
  });
});
