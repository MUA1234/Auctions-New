'use client';

import { useEffect, useState } from 'react';
import { apiBase } from './api';
import { DEFAULT_REQUIRED_SECURITY_BPS } from './credit-policy';

/**
 * The canonical credit policy, fetched from the backend (Rev 06.2 §8/§16). The
 * frontend consumes ONE authoritative policy for its non-authoritative previews
 * instead of hard-coding 5%. Starts from the safe default so the UI renders
 * immediately, then swaps to the server value; the backend stays authoritative.
 */
export interface CreditPolicy {
  requiredSecurityBps: number;
  capacityMultiple: number;
  enforcement: string;
  policyVersion: string;
}

const FALLBACK: CreditPolicy = {
  requiredSecurityBps: DEFAULT_REQUIRED_SECURITY_BPS,
  capacityMultiple: 10_000 / DEFAULT_REQUIRED_SECURITY_BPS,
  enforcement: 'facility',
  policyVersion: 'v1',
};

export function useCreditPolicy(): CreditPolicy {
  const [policy, setPolicy] = useState<CreditPolicy>(FALLBACK);

  useEffect(() => {
    let alive = true;
    fetch(`${apiBase}/members/credit-policy`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: CreditPolicy | null) => {
        if (alive && p && p.requiredSecurityBps > 0) setPolicy(p);
      })
      .catch(() => {
        /* keep the safe default */
      });
    return () => {
      alive = false;
    };
  }, []);

  return policy;
}
