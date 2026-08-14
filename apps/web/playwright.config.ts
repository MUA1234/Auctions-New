import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E for the critical Singha flows (Revision 06.1 P1-14). Runs against a
 * locally started Next dev server; the catalogue reads the public (unauthenticated)
 * API so tests never depend on production credentials. Point NEXT_PUBLIC_API_URL at
 * any environment; it defaults to the live backend origin so `pnpm --filter
 * @singha/web test:e2e` works out of the box after `npx playwright install chromium`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://auctions-backend-production-f10e.up.railway.app';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['line']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Allow pointing at a pre-installed Chromium (e.g. a managed runner where the
    // Playwright-pinned build isn't downloaded) via PW_EXECUTABLE_PATH. Unset in
    // normal runs, so Playwright resolves its own browser as usual.
    ...(process.env.PW_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH } }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, NEXT_PUBLIC_API_URL: API },
  },
});
