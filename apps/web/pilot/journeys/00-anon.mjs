/**
 * Anonymous visitor — real browser, mobile-first, the controlled preview (?evo=on&v3=on).
 *
 * Drives the ACTUAL Next.js frontend at all four widths (390 primary, 768, 1440, 1920) across the
 * homepage, the AuctionFlow catalogue and a real lot page, asserting: the page renders, there is no
 * horizontal overflow (mobile-first integrity), no uncaught page errors, the catalogue actually
 * shows lots, and the floating Singha AI launcher is present on browse pages but suppressed on the
 * lot page (where the sticky bid dock owns the bottom bar — the D2 fix). Screenshots are captured
 * per width as visual evidence.
 */
import { WIDTHS } from '../config.mjs';

const PAGES = [
  { key: 'home', path: '/' },
  { key: 'catalogue', path: '/catalogue' },
  { key: 'exchange', path: '/exchange' },
];

/**
 * Runs in the page: is the floating "Ask Singha AI" launcher actually VISIBLE? Targets the
 * launcher precisely (not the always-present "Singha home" logo link) and reads computed
 * display/visibility/opacity + box size — never offsetParent, which is null for a position:fixed
 * element even when it is on screen. So `max-lg:hidden` (display:none) reads correctly as hidden.
 */
function isLauncherVisible() {
  const el = document.querySelector(
    'button[aria-label="Ask Singha AI"], [data-testid="assistant-launcher"]',
  );
  if (!el) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export default {
  id: 'anon-responsive',
  title: 'Anonymous visitor — homepage / catalogue / lot @ 390·768·1440·1920 (real browser)',
  async run({ browser, lib, fixtures, log }) {
    const steps = [];
    const push = (name, ok, detail = '') =>
      steps.push({ name, ok, detail: String(detail).slice(0, 160) });
    const widths = {};
    const lotId = fixtures.auction?.listingId;
    const nav = { waitUntil: 'domcontentloaded', settle: 1500 };

    for (const w of WIDTHS) {
      const ctx = await lib.personaContext(browser, { width: w.w, height: w.h });
      const page = await ctx.newPage();
      let maxOverflow = 0;
      const errors = [];
      try {
        for (const p of PAGES) {
          const r = await lib.visit(page, p.path, nav);
          maxOverflow = Math.max(maxOverflow, r.overflowPx ?? 0);
          errors.push(...(r.errors || []));
          await lib.shotViewport(page, `anon-${p.key}-${w.name}`);
          if (p.key === 'catalogue') {
            const cards = await page
              .evaluate(() => document.querySelectorAll('a[href^="/lot/"]').length)
              .catch(() => 0);
            push(`catalogue renders lots @ ${w.name}`, cards > 0, `lotLinks=${cards}`);
          }
          if (p.key === 'home') {
            const launcher = await page.evaluate(isLauncherVisible).catch(() => false);
            push(
              `Singha AI launcher visible on browse @ ${w.name}`,
              launcher === true,
              `launcherVisible=${launcher}`,
            );
          }
        }
        // A real lot page (media-led, sticky dock). SSE keeps the socket open, so never wait on
        // networkidle here — domcontentloaded + settle is the correct signal.
        if (lotId) {
          const lr = await lib.visit(page, `/lot/${lotId}`, nav);
          maxOverflow = Math.max(maxOverflow, lr.overflowPx ?? 0);
          errors.push(...(lr.errors || []));
          await lib.shotViewport(page, `anon-lot-${w.name}`);
          const launcherOnLot = await page.evaluate(isLauncherVisible).catch(() => false);
          // On mobile/tablet the floating launcher must yield to the sticky "Place bid" dock (D2):
          // it is display:none below lg, so a VISIBILITY check (not mere DOM presence) is required.
          if (w.w < 1024)
            push(
              `lot page: launcher yields to bid dock @ ${w.name}`,
              launcherOnLot === false,
              `launcherVisible=${launcherOnLot}`,
            );
          else
            push(
              `lot page: launcher available on desktop @ ${w.name}`,
              launcherOnLot === true,
              `launcherVisible=${launcherOnLot}`,
            );
        }
      } finally {
        await ctx.close();
      }
      const pageErrors = errors.filter((e) => /PAGEERROR|GOTO/.test(e));
      widths[w.name] = { overflowPx: maxOverflow, errors: pageErrors.length };
      push(
        `no horizontal overflow @ ${w.name} (mobile-first)`,
        maxOverflow <= 2,
        `overflowPx=${maxOverflow}`,
      );
      push(
        `no uncaught page errors @ ${w.name}`,
        pageErrors.length === 0,
        pageErrors.slice(0, 2).join(' | ') || 'clean',
      );
      log(`anon @ ${w.name}: overflow=${maxOverflow}px pageErrors=${pageErrors.length}`);
    }

    const failed = steps.filter((s) => !s.ok);
    return {
      result: failed.length === 0 ? 'PASS' : failed.length <= 2 ? 'PARTIAL' : 'FAIL',
      steps,
      widths,
      backendVerified: false,
      securityVerified: false,
      notes:
        'Real Chromium against the merged FE at 390/768/1440/1920. Overflow, page-error, catalogue-render and launcher/dock-collision (D2) checks per width; screenshots captured.',
    };
  },
};
