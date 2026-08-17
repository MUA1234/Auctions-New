/** Browser + capture helpers for the Singha pilot. Wraps Playwright chromium. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CHROMIUM, OUT_DIR, RUN_ID, feUrl } from '../config.mjs';

const SHOT_DIR = path.join(OUT_DIR, RUN_ID, 'shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

export async function launch() {
  return chromium.launch({ executablePath: CHROMIUM, headless: true });
}

/**
 * A browser context for one persona. `storageState` (Playwright JSON) carries the persona's
 * signed-in session so multiple personas act concurrently in one run.
 */
export async function personaContext(browser, { width = 1440, height = 900, storageState } = {}) {
  return browser.newContext({ viewport: { width, height }, storageState, deviceScaleFactor: 1 });
}

/** Attach console-error + pageerror capture to a page; returns the collecting array. */
export function trackErrors(page) {
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e.message || e).slice(0, 300)));
  return errs;
}

/** Navigate to a FE path (preview flags applied) and return {errors, overflowPx}. */
export async function visit(page, pathname, { waitUntil = 'networkidle', settle = 900 } = {}) {
  const errors = trackErrors(page);
  try {
    await page.goto(feUrl(pathname), { waitUntil, timeout: 40000 });
  } catch (e) {
    errors.push('GOTO: ' + String(e.message || e).slice(0, 160));
  }
  await page.waitForTimeout(settle);
  const overflowPx = await page
    .evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    .catch(() => -1);
  return { errors, overflowPx };
}

/** Full-page screenshot tagged with the run id + a label. */
export async function shot(page, label) {
  const file = path.join(SHOT_DIR, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

export async function shotViewport(page, label) {
  const file = path.join(SHOT_DIR, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
}

export { SHOT_DIR };
