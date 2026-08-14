'use client';

import { useEffect } from 'react';
import { useAnalytics } from '../lib/analytics';

/**
 * Fires the dashboard-pilot "surface opened" analytics event once on mount (pack doc 09).
 * A no-op unless `dashboardV3Beta` is on. Renders nothing. Kept as a tiny component so the
 * server/data parts of the dashboard page stay untouched.
 */
export function DashboardInstrumentation() {
  const { track } = useAnalytics();
  useEffect(() => {
    track('DASHBOARD', 'opened', { funnelStep: 'view' });
  }, [track]);
  return null;
}
