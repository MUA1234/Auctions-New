// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  record: vi.fn(() => Promise.resolve()),
  flags: { dashboardV3Beta: false },
  token: 'tok' as string | null,
}));

vi.mock('../lib/api', () => ({ recordProductEvent: h.record }));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ token: h.token, user: null, loading: false }) }));
vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));

import { DashboardInstrumentation } from './DashboardInstrumentation';

beforeEach(() => {
  h.record.mockClear();
  h.token = 'tok';
});
afterEach(cleanup);

describe('DashboardInstrumentation (pack doc 09)', () => {
  it('records a surface-opened event when dashboardV3Beta is ON', async () => {
    h.flags = { dashboardV3Beta: true };
    render(<DashboardInstrumentation />);
    await waitFor(() => expect(h.record).toHaveBeenCalledTimes(1));
    const [body] = h.record.mock.calls[0]!;
    expect(body).toMatchObject({ surface: 'DASHBOARD', action: 'opened', funnelStep: 'view' });
  });

  it('is a no-op when the flag is OFF (no instrumentation until the pilot gate opens)', async () => {
    h.flags = { dashboardV3Beta: false };
    render(<DashboardInstrumentation />);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.record).not.toHaveBeenCalled();
  });
});
