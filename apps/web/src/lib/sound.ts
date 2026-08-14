'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Premium auction sound + haptics (pack doc 05). A restrained, professional cue
 * language — a soft gavel, a lead chime, an outbid alert, a countdown pulse, a win
 * flourish — NOT slot-machine conditioning. Cues are synthesized with the Web Audio API
 * (no asset payload) and every cue respects the user's Sound setting AND the OS
 * reduced-motion preference. Haptics use the Vibration API where available.
 *
 * Sound modes: `on` (sound + haptics), `reduced` (haptics only, no audio), `off`.
 */
export type SoundMode = 'on' | 'reduced' | 'off';
export const SOUND_MODES: SoundMode[] = ['on', 'reduced', 'off'];
const KEY = 'singha_sound_mode';

export type Cue = 'accepted' | 'take_lead' | 'outbid' | 'countdown' | 'win';

interface CueSpec {
  freqs: number[];
  durationMs: number;
  type: OscillatorType;
  gain: number;
  vibrate: number | number[];
}

// Deliberately gentle, musical intervals — nothing shrill or casino-like.
const CUES: Record<Cue, CueSpec> = {
  accepted: { freqs: [392], durationMs: 90, type: 'sine', gain: 0.05, vibrate: 12 },
  take_lead: {
    freqs: [523.25, 659.25],
    durationMs: 160,
    type: 'sine',
    gain: 0.06,
    vibrate: [10, 30, 14],
  },
  outbid: {
    freqs: [349.23, 293.66],
    durationMs: 200,
    type: 'triangle',
    gain: 0.06,
    vibrate: [24, 40, 24],
  },
  countdown: { freqs: [440], durationMs: 70, type: 'sine', gain: 0.04, vibrate: 8 },
  win: {
    freqs: [523.25, 659.25, 783.99],
    durationMs: 320,
    type: 'sine',
    gain: 0.07,
    vibrate: [12, 30, 12, 30, 40],
  },
};

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = audioCtx ?? new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function getSoundMode(): SoundMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'reduced' || v === 'off' ? v : 'reduced';
  } catch {
    return 'reduced';
  }
}

export function setSoundMode(mode: SoundMode): void {
  try {
    localStorage.setItem(KEY, mode);
    window.dispatchEvent(new CustomEvent('singha:sound-mode', { detail: mode }));
  } catch {
    /* ignore */
  }
}

function haptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/**
 * Play a cue, honouring the current mode + reduced motion. In `reduced` mode (or when the
 * OS asks for reduced motion) audio is skipped but a light haptic still fires; in `off`
 * nothing happens. Safe to call anywhere — it never throws and no-ops without Web Audio.
 */
export function playCue(cue: Cue, mode: SoundMode = getSoundMode()): void {
  if (mode === 'off') return;
  const spec = CUES[cue];
  const audible = mode === 'on' && !prefersReducedMotion();
  if (audible) {
    const ac = ctx();
    if (ac) {
      if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
      const now = ac.currentTime;
      spec.freqs.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = spec.type;
        osc.frequency.value = freq;
        const start = now + (i * spec.durationMs) / 1000 / spec.freqs.length;
        const end = start + spec.durationMs / 1000;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(spec.gain, start + 0.012); // gentle attack
        gain.gain.exponentialRampToValueAtTime(0.0001, end); // smooth release
        osc.connect(gain).connect(ac.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      });
    }
  }
  haptic(spec.vibrate);
}

/** React hook exposing the current sound mode and a setter, reacting to changes. */
export function useSoundMode(): { mode: SoundMode; setMode: (m: SoundMode) => void } {
  const [mode, setModeState] = useState<SoundMode>('reduced');
  useEffect(() => {
    setModeState(getSoundMode());
    const onChange = (e: Event) => setModeState((e as CustomEvent<SoundMode>).detail);
    window.addEventListener('singha:sound-mode', onChange);
    return () => window.removeEventListener('singha:sound-mode', onChange);
  }, []);
  const setMode = useCallback((m: SoundMode) => {
    setSoundMode(m);
    setModeState(m);
    if (m === 'on') playCue('accepted', 'on'); // audible confirmation of enabling sound
  }, []);
  return { mode, setMode };
}
