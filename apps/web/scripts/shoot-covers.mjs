#!/usr/bin/env node
/**
 * Visual verification of the owner-supplied PNG covers in the real app: loads the catalogue and one
 * lot-detail page at the four directive widths (390/768/1440/1920), screenshots each, and reports
 * how many demo cover images actually decoded (naturalWidth > 0) plus horizontal overflow and
 * console errors. Discovers a real lot id from the v2 catalogue so it needs no hardcoded ref.
 * Verification tool, not a gate.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB_BASE ?? 'http://localhost:3000';
const API = process.env.API_BASE ?? 'http://localhost:4000';
const OUT = '/home/user/Auctions-New/apps/web/demo-shots';
mkdirSync(OUT, { recursive: true });

const widths = [
  { name: '390', w: 390, h: 844 },
  { name: '768', w: 768, h: 1024 },
  { name: '1440', w: 1440, h: 900 },
  { name: '1920', w: 1920, h: 1080 },
];

// Discover a real lot id (prefer one with a cover) from the enriched catalogue.
let lotId = null;
try {
  const r = await fetch(`${API}/api/v2/catalogue?limit=24`, { cache: 'no-store' });
  const j = await r.json();
  const items = j.items ?? j.data ?? j.rows ?? [];
  const withCover =
    items.find((it) => it.cover || it.coverMedia || (it.media && it.media[0])) ?? items[0];
  lotId = withCover && (withCover.id ?? withCover.publicRef ?? withCover.ref ?? withCover.slug);
  console.log(`discovered lotId=${lotId} (of ${items.length} items)`);
} catch (e) {
  console.log('lot discovery failed:', String(e).slice(0, 120));
}

async function analyze(page) {
  return page.evaluate(() => {
    const imgs = Array.from(document.images);
    const demo = imgs.filter((i) => /\/demo\/smkt\//.test(i.currentSrc || i.src));
    const loaded = demo.filter((i) => i.complete && i.naturalWidth > 0);
    return {
      totalImgs: imgs.length,
      demoImgs: demo.length,
      demoLoaded: loaded.length,
      brokenDemo: demo.length - loaded.length,
      sample: demo.slice(0, 2).map((i) => (i.currentSrc || i.src).replace(location.origin, '')),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });
}

const targets = [{ label: 'catalogue', path: '/catalogue' }];
if (lotId) targets.push({ label: 'lot', path: `/lot/${encodeURIComponent(lotId)}` });

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const results = [];
for (const t of targets) {
  for (const vp of widths) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 120)));
    try {
      await page.goto(`${WEB}${t.path}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1800);
      const a = await analyze(page);
      const file = `${OUT}/${t.label}-${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: false });
      results.push({ label: t.label, width: vp.name, ...a, errors: errors.length, file });
    } catch (e) {
      results.push({ label: t.label, width: vp.name, error: String(e).slice(0, 140) });
    }
    await ctx.close();
  }
}
await browser.close();

console.log('=== cover verification shots ===');
for (const r of results) {
  if (r.error) console.log(`  ${r.label} @${r.width}: ERROR ${r.error}`);
  else
    console.log(
      `  ${r.label} @${r.width}: imgs=${r.totalImgs} demo=${r.demoImgs} loaded=${r.demoLoaded} broken=${r.brokenDemo} overflow=${r.overflow} consoleErr=${r.errors} | ${r.sample.join(', ')}`,
    );
}
