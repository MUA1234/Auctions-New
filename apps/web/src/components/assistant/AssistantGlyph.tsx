/**
 * Shared "Singha AI" glyph — a speech bubble with three dots, in the same hand-drawn inline-SVG
 * line-icon convention as the rest of the app (`stroke="currentColor"`, no external icon set).
 * There is no small square lion mark to reuse: `BrandLogo` is the full wide lion+wordmark lockup
 * (913×183) meant for headers, not a ~16–24px launcher/button glyph, so a purpose-built chat glyph
 * is used instead. Used by the floating launcher, the AI message avatar and `AskSinghaButton`, so
 * the assistant reads as one consistent mark everywhere it appears.
 */
export function AssistantGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 4h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-8L7 20v-4H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
