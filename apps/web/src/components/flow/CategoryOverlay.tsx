'use client';

/**
 * Big category label for a Flow rail (pack doc 08). It lives INSIDE its own band —
 * absolutely centred on that row — so the name is always aligned with the lots it
 * describes (never floating at the screen centre). Hidden by default; it "pops" in on
 * hover (mouse over the row) via `group-hover`, or when `active` is set (touch / the row
 * scrolling into view). Purely decorative (`aria-hidden`) — each band keeps a real
 * screen-reader heading — and it never blocks interaction (`pointer-events-none`).
 */
export function CategoryOverlay({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      <span
        className={`max-w-full select-none overflow-hidden text-ellipsis whitespace-nowrap font-serif font-black uppercase tracking-tight text-transparent transition-all duration-500 motion-reduce:transition-none ${
          active
            ? 'opacity-100 blur-0'
            : 'opacity-0 blur-sm group-hover/band:opacity-100 group-hover/band:blur-0'
        }`}
        style={{
          fontSize: 'clamp(2rem, 8vw, 6rem)',
          backgroundImage: 'linear-gradient(180deg,#5fe0a3 0%,#1fa055 55%,#c9a24b 120%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          textShadow: '0 0 60px rgba(31,160,85,0.3)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
