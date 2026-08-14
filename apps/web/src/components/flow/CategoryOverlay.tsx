'use client';

/**
 * Floating category overlay for the V3 Flow canvas (pack doc 08). When the active
 * band changes a large glowing label (`VEHICLES`, `GEMS`, …) blooms in, then fades
 * as scrolling resumes. It is purely decorative — `aria-hidden` — because each band
 * keeps a real semantic heading in the DOM for screen readers. It never pins to a
 * side rail and never blocks interaction (`pointer-events-none`).
 */
export function CategoryOverlay({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center px-6"
    >
      <span
        className={`select-none text-center font-serif font-black uppercase tracking-tight text-transparent transition-all duration-500 motion-reduce:transition-none ${
          visible ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
        }`}
        style={{
          fontSize: 'clamp(2.5rem, 12vw, 9rem)',
          backgroundImage: 'linear-gradient(180deg,#5fe0a3 0%,#1fa055 55%,#c9a24b 120%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          textShadow: visible ? '0 0 60px rgba(31,160,85,0.35)' : 'none',
        }}
      >
        {label}
      </span>
    </div>
  );
}
