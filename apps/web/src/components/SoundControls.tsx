'use client';

import { type SoundMode, useSoundMode } from '../lib/sound';

const LABEL: Record<SoundMode, string> = { on: 'On', reduced: 'Reduced', off: 'Off' };
const HINT: Record<SoundMode, string> = {
  on: 'Subtle sound + haptics',
  reduced: 'Haptics only',
  off: 'Silent',
};

/**
 * Sound & haptics control (pack doc 05): On / Reduced / Off. Premium auction cues, not
 * casino conditioning. Reduced keeps haptics but no audio; the whole thing also honours
 * the OS reduced-motion setting at play time.
 */
export function SoundControls() {
  const { mode, setMode } = useSoundMode();
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Sound and haptics"
        className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
      >
        {(['on', 'reduced', 'off'] as SoundMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              mode === m
                ? 'bg-gold-400/15 font-medium text-gold-300'
                : 'text-bone-400 hover:text-bone'
            }`}
          >
            {LABEL[m]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-bone-500">{HINT[mode]}</p>
    </div>
  );
}
