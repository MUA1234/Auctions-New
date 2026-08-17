/** Persona auth for the pilot: mint dev tokens, expose them to the stub, drive the real login. */
import fs from 'node:fs';
import { devToken } from './api.mjs';
import { feUrl } from '../config.mjs';

const TOKENS_FILE = process.env.PILOT_TOKENS_FILE || '/home/user/pilot-tokens.json';

/**
 * Mint a dev token for each persona and write the email→token map the stub hot-reads,
 * so each browser context can sign in as its own synthetic user via the real login form.
 * personas: [{ email, customerId, roles }]
 */
export async function provisionTokens(personas) {
  const map = {};
  const out = [];
  for (const p of personas) {
    const token = await devToken({ email: p.email, customerId: p.customerId, roles: p.roles });
    map[p.email] = token;
    out.push({ ...p, token });
  }
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(map, null, 2));
  return out;
}

/** Drive the real login form as `email`; returns true if it lands signed-in. */
export async function login(page, email, password = 'pilot-pass-123') {
  await page.goto(feUrl('/login'), { waitUntil: 'networkidle', timeout: 40000 });
  await page.fill('input[type="email"], input[name="email"]', email).catch(() => {});
  await page.fill('input[type="password"], input[name="password"]', password).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(3500);
  // best-effort MFA (stub reports a verified factor; dev token carries aal2 so usually skipped)
  const otp = await page.$(
    'input[inputmode="numeric"], input[autocomplete="one-time-code"], input[name*="code"]',
  );
  if (otp) {
    await otp.fill('123456').catch(() => {});
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(2500);
  }
  return !/\/login(\?|$)/.test(page.url());
}

/** Log a persona in within a throwaway context and return its Playwright storageState for reuse. */
export async function sessionState(browser, email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const ok = await login(page, email, password);
  const state = await ctx.storageState();
  await ctx.close();
  return { ok, state };
}
