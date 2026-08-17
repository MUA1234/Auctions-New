#!/usr/bin/env node
/**
 * Quick visual verification of the demo-populated marketplace: loads the catalogue + a lot detail
 * at mobile/desktop widths, screenshots them, and reports how many demo images actually loaded
 * (naturalWidth > 0) plus any horizontal overflow / console errors. Verification tool, not a gate.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.WEB_BASE ?? 'http://localhost:3000';
const OUT = '/home/user/Auctions-New/apps/web/demo-shots';
mkdirSync(OUT, { recursive: true });

const widths = [
  { name: '390', w: 390, h: 844 },
  { name: '1440', w: 1440, h: 900 },
];

async function analyze(page) {
  return page.evaluate(() => {
    const imgs = Array.from(document.images);
    const demo = imgs.filter((i) => /\/demo\/smkt\//.test(i.currentSrc || i.src));
    const demoLoaded = demo.filter((i) => i.complete && i.naturalWidth > 0);
    return {
      totalImgs: imgs.length,
      demoImgs: demo.length,
      demoLoaded: demoLoaded.length,
      sample: demo.slice(0, 2).map((i) => (i.currentSrc || i.src).replace(location.origin, '')),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });
}

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const results = [];
for (const path of ['/catalogue', '/catalogue?v3=on']) {
  for (const vp of widths) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 100)));
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1500);
      const a = await analyze(page);
      const file = `${OUT}/catalogue${path.includes('v3') ? '-v3' : ''}-${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: false });
      results.push({ path, width: vp.name, ...a, errors: errors.length, file });
    } catch (e) {
      results.push({ path, width: vp.name, error: String(e).slice(0, 120) });
    }
    await ctx.close();
  }
}
await browser.close();

console.log('=== demo catalogue shots ===');
for (const r of results) {
  if (r.error) console.log(`  ${r.path} @${r.width}: ERROR ${r.error}`);
  else
    console.log(
      `  ${r.path} @${r.width}: imgs=${r.totalImgs} demo=${r.demoImgs} loaded=${r.demoLoaded} overflow=${r.overflow} consoleErr=${r.errors} | ${r.sample.join(', ')}`,
    );
}
