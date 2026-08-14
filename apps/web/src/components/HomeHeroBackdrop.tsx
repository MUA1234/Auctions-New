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
 * Two scrims keep the light hero copy legible over the artwork and blend the image into the
 * page's black base: a horizontal wash that is darkest on the left (where the headline and
 * CTAs sit) and a vertical wash that fades the foot of the hero into coal-950. Decorative
 * only (`aria-hidden`, never a tap target) and reduced-motion safe — the sole motion is a
 * one-shot opacity fade-in, which is disabled under `prefers-reduced-motion`.
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
      {/* The artwork — cover-fit, anchored slightly low so the glow sits near the fold. */}
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: "url('/images/home-hero.webp')",
          backgroundPosition: 'center 62%',
        }}
      />
      {/* Legibility + blend scrims (kept in one layer as stacked gradients). */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            // Horizontal: dark under the left-hand copy, opening up over the glow.
            'linear-gradient(90deg, rgba(9,9,10,0.92) 0%, rgba(9,9,10,0.66) 30%, rgba(9,9,10,0.22) 56%, rgba(9,9,10,0.5) 100%)',
            // Vertical: soften the top under the header, fade the foot into the page base.
            'linear-gradient(180deg, rgba(9,9,10,0.72) 0%, rgba(9,9,10,0) 26%, rgba(9,9,10,0) 52%, #09090a 100%)',
          ].join(','),
        }}
      />
    </div>
  );
}
