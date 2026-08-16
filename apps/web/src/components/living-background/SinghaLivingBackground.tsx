'use client';

import { useEffect, useRef, useState } from 'react';
import { useFlags } from '../../lib/use-flags';
import { createParticleField, type ParticleFieldHandle } from './ParticleField';
import { usePointerAtmosphere } from './usePointerAtmosphere';
import styles from './living-background.module.css';

/**
 * SinghaLivingBackground — the homepage's fixed, cinematic "living image".
 *
 * Renders the supplied Singha scene as a viewport-fixed layered environment (base image
 * + ambient light + haze + light shaft + Canvas motes + legibility vignette). It stays
 * pinned to the viewport while the page scrolls; every motion is time-based and NEVER
 * coupled to scroll position, scroll progress, or any scroll library. Progressive
 * enhancement decides how much runs:
 *
 *   Level A (full)     — capable desktop, fine pointer, motion allowed:
 *                        image + breathing + lights + haze + motes + pointer parallax.
 *   Level B (standard) — motion allowed but coarse pointer / smaller viewport:
 *                        image + lights + haze + fewer motes, no pointer parallax.
 *   Level C (minimal)  — reduced-motion or no Canvas: the fixed image + static vignette,
 *                        with all ambient motion stilled (a designed static scene).
 *
 * Gated on `v3VisualArchitecture` so production keeps its restrained hero until the V3
 * visual system is switched on (it appears immediately in a `?v3=on` review session).
 * The artwork is self-hosted (`/images/...`) to satisfy the strict `img-src 'self'` CSP.
 * Decorative only: `aria-hidden`, never a tap target (`pointer-events: none`).
 */
export function SinghaLivingBackground() {
  const { flags } = useFlags();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [shown, setShown] = useState(false);
  // Capability tier resolved on the client after mount (SSR-safe defaults = minimal).
  const [motion, setMotion] = useState(false); // ambient animation allowed
  const [particleCount, setParticleCount] = useState(0);
  const [pointer, setPointer] = useState(false); // desktop fine-pointer parallax

  // Resolve device capability once mounted.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const canvasOk = (() => {
      try {
        return !!document.createElement('canvas').getContext('2d');
      } catch {
        return false;
      }
    })();
    const w = window.innerWidth;
    const count = w >= 1024 ? 26 : w >= 640 ? 16 : 8;

    setMotion(!reduce);
    setPointer(!reduce && fine && w >= 1024);
    setParticleCount(reduce || !canvasOk ? 0 : count);

    // Fade in on the next frame so the opacity transition actually plays.
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Canvas mote lifecycle — only when motion is allowed and a budget was assigned.
  useEffect(() => {
    if (!flags.v3VisualArchitecture) return;
    if (!motion || particleCount <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handle: ParticleFieldHandle | null = null;
    // Defer to idle-ish so it never competes with hero paint / hydration.
    const t = window.setTimeout(() => {
      handle = createParticleField(canvas, { count: particleCount, dprCap: 2, fps: 30 });
      handle.start();
    }, 400);
    return () => {
      window.clearTimeout(t);
      handle?.destroy();
    };
  }, [flags.v3VisualArchitecture, motion, particleCount]);

  usePointerAtmosphere(rootRef, pointer && flags.v3VisualArchitecture);

  if (!flags.v3VisualArchitecture) return null;

  return (
    <div ref={rootRef} aria-hidden="true" className={`${styles.root} ${shown ? styles.shown : ''}`}>
      <picture className={styles.imageWrap}>
        <source
          type="image/avif"
          srcSet="/images/singha-hero-living-828.avif 828w, /images/singha-hero-living-1280.avif 1280w, /images/singha-hero-living-1920.avif 1920w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/images/singha-hero-living-828.webp 828w, /images/singha-hero-living-1280.webp 1280w, /images/singha-hero-living-1920.webp 1920w"
          sizes="100vw"
        />
        {/* A plain <img> (not next/image) is deliberate: this is a decorative, full-bleed
            fixed background; next/image `fill` adds layout constraints we don't want, and
            the responsive AVIF/WebP sources above already handle format + size negotiation. */}
        <img
          className={styles.image}
          src="/images/singha-hero-living.jpg"
          alt=""
          decoding="async"
        />
      </picture>

      <div className={styles.atmos}>
        <div className={`${styles.glow} ${styles.glowCool}`} />
        <div className={`${styles.glow} ${styles.glowWarm}`} />
        <div className={styles.haze} />
        <div className={styles.shaft} />
      </div>

      <canvas className={styles.particles} ref={canvasRef} />

      <div className={styles.vignette} />
    </div>
  );
}
