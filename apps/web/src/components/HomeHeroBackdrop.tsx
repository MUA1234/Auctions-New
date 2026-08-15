'use client';

import { useEffect, useState } from 'react';
import { useFlags } from '../lib/use-flags';

/**
 * Cinematic homepage hero backdrop (V3). A full-bleed, self-hosted image behind the hero
 * copy and showcase, gated on `v3VisualArchitecture` so production keeps the current
 * restrained radial-gradient hero until V3 is switched on (it appears immediately in a
 * `?v3=on` review session). The image is served from our own origin (`/images/...`), so it
 * satisfies the strict `img-src 'self'` CSP — no external hotlink.
 *
 * The artwork is shown clean — no darkening scrim or tint over it; hero-copy legibility comes
 * from text shadows on the copy itself (see the hero in `app/page.tsx`). Decorative only
 * (`aria-hidden`, never a tap target) and reduced-motion safe — the sole motion is a one-shot
 * opacity fade-in, which is disabled under `prefers-reduced-motion`.
 */
export function HomeHeroBackdrop() {
  const { flags } = useFlags();
  const [shown, setShown] = useState(false);

  useEffect(() => setShown(true), []);

  if (!flags.v3VisualArchitecture) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ease-out motion-reduce:transition-none"
      style={{ opacity: shown ? 1 : 0 }}
    >
      {/* The artwork — cover-fit. Shown clean: no tint/scrim overlay (hero-copy legibility comes
          from text shadows). On mobile the frame is shifted left so the bright glow sits away from
          the full-width, left-aligned copy; from md up it re-centres for the two-column layout. */}
      <div
        className="absolute inset-0 bg-cover [background-position:28%_60%] md:[background-position:center_62%]"
        style={{ backgroundImage: "url('/images/home-hero.webp')" }}
      />
    </div>
  );
}
