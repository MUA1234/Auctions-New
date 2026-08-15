'use client';

/**
 * Big category label for a Flow rail (pack doc 08). It lives INSIDE its own band —
 * absolutely centred on that row — so the name is always aligned with the lots it
 * describes (never floating at the screen centre). It is driven PURELY by `active`: the
 * band "pops" the name in on mouse-enter / touch, then it fades itself back out a moment
 * later (see `poke` in FlowMatrixBand) so it never sits on top of the lots and block them.
 * Purely decorative (`aria-hidden`) — each band keeps a real screen-reader heading — and
 * it never blocks interaction (`pointer-events-none`).
 */
export function CategoryOverlay({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      <span
        className={`max-w-full select-none overflow-hidden text-ellipsis whitespace-nowrap font-display font-extrabold uppercase tracking-[0.02em] text-transparent transition-all duration-500 motion-reduce:transition-none ${
          active ? 'opacity-80 blur-0' : 'opacity-0 blur-sm'
        }`}
        style={{
          // Restrained bone→gold wordmark on the house palette (no green), a step
          // smaller than before so it reads as a refined watermark, not a sign.
          fontSize: 'clamp(1.1rem, 4vw, 3rem)',
          backgroundImage: 'linear-gradient(180deg,#f3ecdb 0%,#d9b869 55%,#c29a3f 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          textShadow: '0 0 34px rgba(201,162,75,0.16)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
