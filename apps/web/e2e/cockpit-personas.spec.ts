import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

/**
 * Real-browser verification of the unified Singha Cockpit (multi-currency correction pass), driven
 * against a LOCAL API + DB. Four personas exercise the properties the correction pass added:
 *   A Buyer + Seller      — one identity shows both buying and selling
 *   B Multi-currency      — Account Health shows LKR + AUD + USD side by side, never blended
 *   C Organisation member — the "Acting as" selector switches Personal ⇄ organisation context
 *   D Unauthorized        — a separate client is isolated; an org it does not belong to is refused
 *
 * Auth: the real app authenticates via Supabase, which is not running in CI/local sandboxes, so we
 * inject a Supabase session cookie whose access_token is a dev-JWT the local API accepts — the
 * cookie is the ONLY stubbed hop; the page then fetches live from the real API/DB. Requires a
 * personas file (PERSONAS_FILE) produced by the seeder and a local API at NEXT_PUBLIC_API_URL; the
 * whole spec skips cleanly when they are absent (e.g. the default Railway-pointed e2e run).
 */
const PERSONAS_FILE = process.env.PERSONAS_FILE ?? '';
const SHOT_DIR = process.env.SHOT_DIR ?? 'cockpit-shots';
const COOKIE_NAME = process.env.SB_COOKIE_NAME ?? 'sb-localhost-auth-token';
const BASE = 'http://localhost:3210';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Persona = {
  label: string;
  token: string;
  customerId: string;
  clientRef: string;
  orgId?: string;
  orgName?: string;
  foreignOrgId?: string;
};

const WIDTHS: Array<[string, number, number]> = [
  ['390', 390, 844],
  ['768', 768, 1024],
  ['1440', 1440, 1024],
];

function loadPersonas(): Record<string, Persona> | null {
  if (!PERSONAS_FILE) return null;
  try {
    return JSON.parse(readFileSync(PERSONAS_FILE, 'utf8')).personas as Record<string, Persona>;
  } catch {
    return null;
  }
}

/** Build the @supabase/ssr session cookie (base64url of a session JSON) for a dev-JWT bearer. */
function sessionCookieValue(token: string, customerId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: token,
    refresh_token: 'seed-refresh',
    expires_at: now + 60 * 60 * 24 * 365,
    expires_in: 60 * 60 * 24 * 365,
    token_type: 'bearer',
    user: {
      id: `seed-${customerId}`,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'seed@sim.local',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(now * 1000).toISOString(),
    },
  };
  return 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
}

async function signIn(context: BrowserContext, p: Persona): Promise<void> {
  await context.clearCookies();
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(p.token, p.customerId), url: BASE },
  ]);
}

async function openCockpit(page: Page): Promise<void> {
  await page.goto(`${BASE}/cockpit`, { waitUntil: 'domcontentloaded' });
  // The signed-in cockpit renders the header; the signed-out state renders "Sign in".
  await page
    .getByRole('heading', { level: 1 })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1200);
}

const personas = loadPersonas();

test.describe.configure({ timeout: 180_000 });

test.describe('Singha Cockpit — real browser, 4 personas', () => {
  test.skip(!personas, 'no PERSONAS_FILE — seed personas against a local API first');
  test.beforeAll(() => mkdirSync(SHOT_DIR, { recursive: true }));

  test('A — one identity shows both buying and selling', async ({ page, context }) => {
    const p = personas!.A;
    await signIn(context, p);
    for (const [w, width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      await openCockpit(page);
      const body = await page.locator('body').innerText();
      expect(body).toContain(p.clientRef); // same Client ID, authoritative
      expect(body).toContain('Buying');
      expect(body).toContain('Selling');
      expect(body).not.toContain('Sign in'); // genuinely authenticated
      await page.screenshot({ path: `${SHOT_DIR}/A-buyer-seller-${w}.png`, fullPage: true });
    }
  });

  test('B — Account Health shows LKR + AUD + USD, never blended', async ({ page, context }) => {
    const p = personas!.B;
    await signIn(context, p);
    for (const [w, width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      await openCockpit(page);
      // The Account Health card is the innermost element holding BOTH the title and the metrics.
      const card = page.locator('div:has-text("Account health"):has-text("Amounts to pay")').last();
      const text = await card.innerText();
      // Every authoritative transaction currency is shown on its own — never summed into one figure.
      expect(text).toContain('LKR');
      expect(text).toContain('AUD');
      expect(text).toContain('USD');
      // The amounts-to-pay metric groups per currency (a ' · ' join), i.e. it is not one blended sum.
      expect(text).toMatch(/(LKR|AUD|USD)[^·\n]*·[^\n]*(LKR|AUD|USD)/);
      await page.screenshot({ path: `${SHOT_DIR}/B-multicurrency-${w}.png`, fullPage: true });
    }
  });

  test('C — context selector switches Personal ⇄ organisation', async ({ page, context }) => {
    const p = personas!.C;
    await signIn(context, p);
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openCockpit(page);
    // Personal context lists the organisation as an authorised context to act for.
    await expect(page.getByText('Acting as')).toBeVisible();
    const orgBtn = page.getByRole('button', { name: p.orgName!, exact: false });
    await expect(orgBtn.first()).toBeVisible();
    await page.screenshot({ path: `${SHOT_DIR}/C-personal-1440.png`, fullPage: true });
    // Switch into the organisation context — the header must become the organisation.
    await orgBtn.first().click();
    await page.waitForTimeout(1500);
    const h1 = await page.getByRole('heading', { level: 1 }).first().innerText();
    expect(h1).toContain(p.orgName!.replace('[SIM] ', '').split(' ')[0]);
    await page.screenshot({ path: `${SHOT_DIR}/C-org-1440.png`, fullPage: true });
    // Mobile width too, so the selector is verified responsive.
    await page.setViewportSize({ width: 390, height: 844 });
    await openCockpit(page);
    await expect(page.getByText('Acting as')).toBeVisible();
    await page.screenshot({ path: `${SHOT_DIR}/C-personal-390.png`, fullPage: true });
  });

  test('D — an unauthorized client is isolated from others and from foreign orgs', async ({
    page,
    context,
  }) => {
    const p = personas!.D;
    await signIn(context, p);
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openCockpit(page);
    const body = await page.locator('body').innerText();
    expect(body).toContain(p.clientRef); // sees its OWN identity
    expect(body).not.toContain('Sign in');
    // A non-member is offered NO organisation context in the UI (nothing to switch into).
    expect(body).not.toContain('Acting as');
    await page.screenshot({ path: `${SHOT_DIR}/D-outsider-1440.png`, fullPage: true });

    // And the API itself refuses a foreign organisation context for this bearer (server-side authz).
    const forbidden = await page.request.get(`${API}/api/v2/me/cockpit?org=${p.foreignOrgId}`, {
      headers: { authorization: `Bearer ${p.token}` },
    });
    expect(forbidden.status()).toBe(403);
  });
});
