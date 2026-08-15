// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// Hoisted spy so the vi.mock factory can reference it (factories are hoisted above imports).
const h = vi.hoisted(() => ({
  fetchControlCentre: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({
    token: 'operator-token',
    user: { id: 'u1', email: 'op@singha.lk', name: 'Op' },
    loading: false,
  }),
}));
// Every relevant Evolution flag ON so the tabbed body renders.
vi.mock('../../lib/use-flags', () => ({
  useFlags: () => ({
    flags: {
      controlCentre: true,
      transactionRouting: true,
      feesEngine: true,
      operatorPayments: true,
      insightEngine: true,
      singhaId: true,
      satelliteNodes: true,
      fxDisplay: false,
    },
    loading: false,
  }),
}));
vi.mock('../../lib/evolution-api', () => ({
  fetchControlCentre: h.fetchControlCentre,
  resolveRouting: vi.fn(),
  computeFees: vi.fn(),
  resolvePaymentRoute: vi.fn(),
  insightRisk: vi.fn(),
  decideCapability: vi.fn(),
  // Imported transitively by <Price> — provided so the module resolves.
  fxConvert: vi.fn(),
}));
// Let the operator body render without a real MFA session.
vi.mock('../../components/MfaGate', () => ({
  MfaGate: ({ children }: { children: ReactNode }) => children,
}));

import { ControlCentre } from './ControlCentre';

afterEach(cleanup);

describe('ControlCentre (E11 operator overview)', () => {
  it('renders the operator counts and alerts from the overview API', async () => {
    h.fetchControlCentre.mockResolvedValue({
      operatorCode: null,
      counts: {
        operators: 7,
        markets: 3,
        routingRules: 5,
        feeRules: 4,
        paymentRoutes: 2,
        supplyProgrammes: 9,
        procurementRequests: 6,
        pendingVerifications: 8,
      },
      alerts: ['8 capability verification(s) pending'],
    });

    render(<ControlCentre />);

    // A count tile label + its (unique) value come straight from the mocked API.
    expect(await screen.findByText('Operators')).toBeTruthy();
    expect(await screen.findByText('7')).toBeTruthy();
    // The alert list renders the API-provided alert.
    expect(await screen.findByText('8 capability verification(s) pending')).toBeTruthy();
    // Overview loads unscoped (no operator filter applied).
    expect(h.fetchControlCentre).toHaveBeenCalledWith('operator-token', undefined);
  });
});
