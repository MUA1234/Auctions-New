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
        className={`max-w-full select-none overflow-hidden text-ellipsis whitespace-nowrap font-serif font-black uppercase tracking-tight text-transparent transition-all duration-500 motion-reduce:transition-none ${
          active ? 'opacity-90 blur-0' : 'opacity-0 blur-sm'
        }`}
        style={{
          fontSize: 'clamp(1.4rem, 5.5vw, 4rem)',
          backgroundImage: 'linear-gradient(180deg,#5fe0a3 0%,#1fa055 55%,#c9a24b 120%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          textShadow: '0 0 48px rgba(31,160,85,0.28)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
