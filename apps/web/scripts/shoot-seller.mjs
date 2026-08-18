#!/usr/bin/env node
/**
 * Visual verification of the config-driven seller Listing Studio (directive §2/§3/§5/§6): walks the
 * wizard, selects the `bulk` (produce/commodities) category to prove it now appears + renders
 * dynamic fields, and screenshots the sale-method, category, specifications and sale-settings
 * (currency) stages. Verification tool, not a gate.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB_BASE ?? 'http://localhost:3000';
const SELLER_PATH = process.env.SELLER_PATH ?? '/sell/new';
const OUT = '/home/user/Auctions-New/apps/web/demo-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1400 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 140)));

const shot = (name) => page.screenshot({ path: `${OUT}/seller-${name}.png`, fullPage: false });
const next = async () => {
  await page
    .getByRole('button', { name: /^(next|continue|review)/i })
    .first()
    .click();
  await page.waitForTimeout(400);
};
const stageHeading = () =>
  page.evaluate(() => document.querySelector('h1,h2,h3')?.textContent?.trim() ?? '');

const report = {};
try {
  await page.goto(`${WEB}${SELLER_PATH}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1200);
  report.landing = await stageHeading();

  // Stage 1 — sale method (config-driven chips)
  await next();
  await shot('1-sale-method');
  report.saleMethodChips = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b) => b.textContent?.trim())
      .filter(Boolean)
      .slice(0, 10),
  );

  // Stage 2 — category: assert `bulk` option now exists, select it
  await next();
  const catOptions = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select option')).map((o) => o.value),
  );
  report.categoryOptions = catOptions;
  if (catOptions.includes('bulk')) await page.selectOption('select', 'bulk');
  await page.waitForTimeout(300);
  await shot('2-category');

  // Stage 3 — core details
  await next();
  await shot('3-core');

  // Stage 4 — specifications (dynamic fields for bulk)
  await next();
  await shot('4-specs');
  report.specFieldLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('label span'))
      .map((s) => s.textContent?.trim())
      .filter(Boolean)
      .slice(0, 12),
  );

  // Advance to Sale settings (stage 9): stages 5,6,7,8 then 9
  for (let i = 0; i < 5; i += 1) await next();
  await shot('9-sale-settings');
  report.currencyOptions = await page.evaluate(() => {
    const sel = Array.from(document.querySelectorAll('select')).find((s) =>
      Array.from(s.options).some((o) => /LKR|USD|AUD/.test(o.value)),
    );
    return sel
      ? Array.from(sel.options)
          .map((o) => o.value)
          .slice(0, 12)
      : [];
  });
  report.moneyLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('label span'))
      .map((s) => s.textContent?.trim())
      .filter((t) => t && /\(/.test(t))
      .slice(0, 8),
  );
} catch (e) {
  report.error = String(e).slice(0, 200);
}
report.consoleErrors = errors.slice(0, 5);
await browser.close();
console.log(JSON.stringify(report, null, 2));
