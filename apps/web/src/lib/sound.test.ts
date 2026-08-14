// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSoundMode, playCue, setSoundMode } from './sound';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('sound + haptics (pack doc 05)', () => {
  it('defaults to "reduced" (haptics, no audio) until chosen', () => {
    expect(getSoundMode()).toBe('reduced');
  });

  it('persists the chosen mode', () => {
    setSoundMode('off');
    expect(getSoundMode()).toBe('off');
    setSoundMode('on');
    expect(getSoundMode()).toBe('on');
  });

  it('never throws and emits no audio/haptics when off', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    expect(() => playCue('outbid', 'off')).not.toThrow();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('fires a haptic in reduced mode (no Web Audio required)', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    playCue('take_lead', 'reduced');
    expect(vibrate).toHaveBeenCalled();
  });

  it('no-ops gracefully when Web Audio is unavailable (jsdom)', () => {
    // jsdom has no AudioContext — the audible path must degrade silently.
    expect(() => playCue('win', 'on')).not.toThrow();
  });
});
