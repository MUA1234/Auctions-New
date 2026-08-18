#!/usr/bin/env node
/**
 * Verify the enhanced lot gallery (directive §17): loads a multi-image lot, screenshots the gallery
 * (arrows + thumbnails + counter), then opens the zoom/fullscreen lightbox and screenshots it.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB_BASE ?? 'http://localhost:3000';
const API = process.env.API_BASE ?? 'http://localhost:4000';
const OUT = '/home/user/Auctions-New/apps/web/demo-shots';
mkdirSync(OUT, { recursive: true });

// Find a lot with the most images.
const r = await fetch(`${API}/api/v2/catalogue?limit=40`, { cache: 'no-store' });
const items = (await r.json()).items ?? [];
let lotId = items[0]?.id;
for (const it of items) {
  const d = await fetch(`${API}/api/v2/catalogue/${it.id}`, { cache: 'no-store' })
    .then((x) => x.json())
    .catch(() => null);
  const imgs = (d?.media ?? []).filter((m) => m.kind !== 'video').length;
  if (imgs >= 3) {
    lotId = it.id;
    break;
  }
}

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
const page = await ctx.newPage();
const report = { lotId };
try {
  await page.goto(`${WEB}/lot/${lotId}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/gallery-lot.png`, fullPage: false });
  report.arrows = await page.locator('button[aria-label="Next image"]').count();
  report.thumbs = await page.locator('button[aria-label^="View image"]').count();
  report.counter = await page
    .locator('text=/^\\d+ \\/ \\d+$/')
    .first()
    .textContent()
    .catch(() => null);
  // Open lightbox
  await page.locator('button[aria-label="Zoom image"]').first().click();
  await page.waitForTimeout(500);
  report.lightbox = await page.locator('[role="dialog"]').count();
  await page.screenshot({ path: `${OUT}/gallery-lightbox.png`, fullPage: false });
} catch (e) {
  report.error = String(e).slice(0, 200);
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
