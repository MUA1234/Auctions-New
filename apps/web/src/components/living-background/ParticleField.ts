/*
 * ParticleField — a lightweight imperative Canvas renderer for the Living Background
 * "distant luminous motes" (firefly/bokeh) effect. One canvas, reused particle objects,
 * a pre-rendered halo sprite, a ~30 FPS throttled rAF loop, DPR capped for fill-rate,
 * and full pause when the document is hidden. It performs NO React work per frame and
 * makes NO allocations in the hot loop.
 *
 * Motion is time-based only. It is never coupled to scroll position.
 */

export type ParticleFieldOptions = {
  /** Active particle budget (tuned by device tier upstream). */
  count: number;
  /** Cap devicePixelRatio for the particle canvas to protect fill-rate. */
  dprCap?: number;
  /** Target frames per second (the effect looks premium well below 60). */
  fps?: number;
};

export type ParticleFieldHandle = {
  /** Begin (or resume) animating. */
  start: () => void;
  /** Pause animating (keeps state). */
  stop: () => void;
  /** Permanently tear down: cancel rAF, drop listeners/observers. */
  destroy: () => void;
};

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number; // radius in CSS px
  a: number; // current alpha
  aBase: number; // baseline alpha
  life: number; // elapsed ms
  maxLife: number; // total lifetime ms
  hue: number; // index into PALETTE
};

// Soft, on-brand mote colours sampled from the source scene: warm gold, cool teal,
// and a rare blue-white. Weighted toward warm so it reads as fireflies, not snow.
const PALETTE: Array<[number, number, number]> = [
  [242, 226, 168], // warm gold
  [198, 224, 158], // green-gold
  [150, 214, 196], // cool teal
  [206, 226, 255], // blue-white (rare)
];

function pick(rng: () => number): number {
  const r = rng();
  if (r < 0.5) return 0;
  if (r < 0.8) return 1;
  if (r < 0.95) return 2;
  return 3;
}

export function createParticleField(
  canvas: HTMLCanvasElement,
  options: ParticleFieldOptions,
): ParticleFieldHandle {
  const rng = () => Math.random();
  const fps = options.fps ?? 30;
  const frameInterval = 1000 / fps;
  const dprCap = options.dprCap ?? 2;

  const ctx = canvas.getContext('2d', { alpha: true });
  const motes: Mote[] = [];
  let cssW = 1;
  let cssH = 1;
  let dpr = 1;
  let raf = 0;
  let running = false;
  let last = 0;
  let acc = 0;

  // Pre-render one soft radial halo sprite per palette colour, then scale it
  // per-particle with drawImage (cheap; no per-frame gradient construction).
  const SPRITE = 64;
  const sprites: HTMLCanvasElement[] = PALETTE.map((rgb) => {
    const c = document.createElement('canvas');
    c.width = SPRITE;
    c.height = SPRITE;
    const cx = c.getContext('2d');
    if (cx) {
      const g = cx.createRadialGradient(
        SPRITE / 2,
        SPRITE / 2,
        0,
        SPRITE / 2,
        SPRITE / 2,
        SPRITE / 2,
      );
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      g.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      cx.fillStyle = g;
      cx.fillRect(0, 0, SPRITE, SPRITE);
    }
    return c;
  });

  function resetMote(m: Mote, initial: boolean) {
    m.x = rng() * cssW;
    // Bias spawn toward the lower-central luminous zone; drift gently upward.
    m.y = (initial ? rng() : 0.45 + rng() * 0.55) * cssH;
    m.r = 0.6 + rng() * 2.2;
    m.vx = (rng() - 0.5) * 6; // px/s
    m.vy = -(3 + rng() * 9); // px/s, upward
    m.aBase = 0.25 + rng() * 0.5;
    m.a = 0;
    m.life = initial ? rng() * 8000 : 0;
    m.maxLife = 8000 + rng() * 12000; // 8–20s
    m.hue = pick(rng);
  }

  function build() {
    motes.length = 0;
    for (let i = 0; i < options.count; i++) {
      const m: Mote = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 1,
        a: 0,
        aBase: 0.4,
        life: 0,
        maxLife: 12000,
        hue: 0,
      };
      resetMote(m, true);
      motes.push(m);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(dprCap, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function step(ts: number) {
    if (!running) return;
    raf = requestAnimationFrame(step);
    if (!last) last = ts;
    let dt = ts - last;
    last = ts;
    // Throttle to the target FPS; clamp dt so a backgrounded tab can't jump the sim.
    acc += dt;
    if (acc < frameInterval) return;
    dt = Math.min(acc, 80);
    acc = 0;

    if (!ctx) return;
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.globalCompositeOperation = 'lighter';
    const dts = dt / 1000;
    for (const m of motes) {
      m.life += dt;
      if (m.life >= m.maxLife || m.y < -20) {
        resetMote(m, false);
        continue;
      }
      m.x += m.vx * dts;
      m.y += m.vy * dts;
      // Gentle sinusoidal sway + fade in/out across the lifetime (no frame jitter).
      const p = m.life / m.maxLife;
      const envelope = Math.sin(Math.PI * p); // 0→1→0
      const twinkle = 0.75 + 0.25 * Math.sin(m.life / 900 + m.x * 0.01);
      m.a = m.aBase * envelope * twinkle;
      const size = m.r * 8; // sprite is a soft halo; draw larger than the core
      const s = sprites[m.hue];
      if (!s) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, m.a));
      ctx.drawImage(s, m.x - size / 2, m.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function start() {
    if (running) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    running = true;
    last = 0;
    acc = 0;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;

  // Init
  resize();
  build();
  if (ro) ro.observe(canvas);
  else window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    start,
    stop,
    destroy() {
      stop();
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
