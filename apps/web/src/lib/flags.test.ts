import { describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ apiBase: 'http://test.local/api/v1' }));

import { DEFAULT_FLAGS, V3_FLAG_KEYS, withV3Preview } from './flags';

describe('withV3Preview (V3 review/preview switch)', () => {
  it('overlays every V3 experience flag ON when preview is enabled', () => {
    const out = withV3Preview(DEFAULT_FLAGS, true);
    for (const key of V3_FLAG_KEYS) expect(out[key]).toBe(true);
  });

  it('is a pure no-op (same reference) when preview is disabled', () => {
    expect(withV3Preview(DEFAULT_FLAGS, false)).toBe(DEFAULT_FLAGS);
  });

  it('never turns a flag OFF — a genuinely-enabled prod flag is preserved', () => {
    const base = { ...DEFAULT_FLAGS, liveAuctions: true };
    const out = withV3Preview(base, true);
    expect(out.liveAuctions).toBe(true);
    expect(out.flowMatrixV3).toBe(true);
  });

  it('does not mutate its input', () => {
    const base = { ...DEFAULT_FLAGS };
    withV3Preview(base, true);
    expect(base.flowMatrixV3).toBe(false);
    expect(base.v3VisualArchitecture).toBe(false);
  });

  it('defaults keep every V3 flag OFF (production is untouched)', () => {
    for (const key of V3_FLAG_KEYS) expect(DEFAULT_FLAGS[key]).toBe(false);
  });
});
