import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Singha Evolution PUBLIC-surface screenshot matrix. Captures the two customer-facing Evolution
 * surfaces that render without a signed-in session — the Logistics reference centre
 * (`/services/logistics`, Reference tab) and a Satellite Market Node local site (`/n/[code]`) —
 * across the responsive width matrix, with deterministic route-mocked data and the Evolution flags
 * forced on. It asserts the hard invariant everywhere: the document never overflows horizontally
 * (brief §15), and it waits on real content (an incoterm code / the node name) so a green run proves
 * the surface rendered rather than the flag-off fallback.
 *
 * The authed Evolution surfaces (commercial offers, sealed comparison, procurement, supply, Singha
 * ID, dashboard, control centre, node console) can't be hermetically screenshotted without a real
 * Supabase session, so they are verified by their jsdom component tests instead; these two are the
 * honest public set. Output PNGs go to $SHOT_DIR (default `evo-screens/`). Run with a pre-installed
 * Chromium via PW_EXECUTABLE_PATH:
 *   SHOT_DIR=evo-screens PW_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     pnpm --filter @singha/web test:e2e evolution-screenshots
 */
const WIDTHS = [360, 390, 430, 768, 1024, 1440, 1920];
const SHOT_DIR = process.env.SHOT_DIR ?? 'evo-screens';
mkdirSync(SHOT_DIR, { recursive: true });

// Every Evolution capability flag on, so any surface renders under review (mirrors `?evo=on`).
const EVO_FLAGS = {
  neutralIaV1: true,
  commercialOffersV2: true,
  sealedOffers: true,
  multiCurrency: true,
  fxDisplay: true,
  logistics: true,
  procurement: true,
  supplyProgrammes: true,
  perishableGoods: true,
  singhaId: true,
  dashboard: true,
  controlCentre: true,
  transactionRouting: true,
  feesEngine: true,
  operatorPayments: true,
  insightEngine: true,
  satelliteNodes: true,
};

async function mockFlags(page: Page) {
  await page.route('**/feature-flags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ features: EVO_FLAGS }),
    }),
  );
}

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

// The global header's auth nav uses a browser Supabase client pointed at a placeholder host under
// test; intercept its calls so no real auth/network error is logged. Keeps the public surface fully
// hermetic (it never depends on a signed-in session) and the captured screenshots free of the
// dev-only error overlay that an unhandled auth fetch would otherwise raise.
async function mockAuth(page: Page) {
  await page.route(/supabase\.co|\/auth\/v1\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

/* ------------------------------ Logistics reference ------------------------------ */

const INCOTERMS = [
  {
    code: 'EXW',
    name: 'Ex Works',
    freightArranger: 'Buyer',
    description: 'Buyer bears cost and risk from the seller’s premises.',
  },
  {
    code: 'FOB',
    name: 'Free On Board',
    freightArranger: 'Buyer',
    description: 'Risk transfers once goods are on board the vessel.',
  },
  {
    code: 'CIF',
    name: 'Cost, Insurance & Freight',
    freightArranger: 'Seller',
    description: 'Seller pays freight and insurance to the destination port.',
  },
  {
    code: 'DAP',
    name: 'Delivered At Place',
    freightArranger: 'Seller',
    description: 'Seller delivers to the named place, ready for unloading.',
  },
];
const LOG_NODES = [
  { id: '1', code: 'LKCMB', name: 'Colombo Port', kind: 'seaport', country: 'LK' },
  { id: '2', code: 'CMBAIR', name: 'Bandaranaike Intl', kind: 'airport', country: 'LK' },
  { id: '3', code: 'AEJEA', name: 'Jebel Ali', kind: 'seaport', country: 'AE' },
  { id: '4', code: 'SGSIN', name: 'Port of Singapore', kind: 'seaport', country: 'SG' },
];

async function mockLogistics(page: Page) {
  await page.route('**/api/v1/logistics/incoterms', (route) =>
    route.fulfill({ json: { incoterms: INCOTERMS } }),
  );
  await page.route('**/api/v1/logistics/nodes', (route) =>
    route.fulfill({ json: { nodes: LOG_NODES } }),
  );
}

test.describe('Evolution public surfaces — Logistics reference (flags on)', () => {
  for (const width of WIDTHS) {
    test(`logistics @ ${width}px — renders + no overflow`, async ({ page }) => {
      await mockFlags(page);
      await mockAuth(page);
      await mockLogistics(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/services/logistics?evo=on');
      // Real content (an incoterm code), not the flag-off fallback.
      await page
        .getByText('EXW', { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(500);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await page.screenshot({ path: `${SHOT_DIR}/logistics-${width}.png`, fullPage: true });
    });
  }
});

/* ------------------------------ Satellite Market Node local site ------------------------------ */

const NODE_PRESENTATION = {
  code: 'lk-colombo',
  name: 'Singha Colombo',
  mode: 'FULL',
  verification: 'VERIFIED',
  presets: { currency: 'LKR', language: 'en', country: 'LK', marketId: 'mkt-lk' },
  capabilities: {
    browse: true,
    originateListings: true,
    takeOffers: true,
    runAuctions: true,
    acceptPayments: true,
  },
};
const NODE_DISCOVERY = {
  nodeCode: 'lk-colombo',
  mode: 'FULL',
  presets: { currency: 'LKR', language: 'en', country: 'LK' },
  source: 'central' as const,
  count: 3,
  listings: [
    { id: 'lot-501', publicRef: 'LOT-501', title: '2018 Toyota Prado' },
    { id: 'lot-502', publicRef: 'LOT-502', title: '3.2ct Blue Sapphire' },
    { id: 'lot-503', publicRef: 'LOT-503', title: 'CAT 320D Excavator' },
  ],
};

async function mockNode(page: Page) {
  // Discovery first — its path is a superset, so register it before the bare-node matcher.
  await page.route(/\/api\/v1\/nodes\/[^/?]+\/discovery(?:\?|$)/, (route) =>
    route.fulfill({ json: NODE_DISCOVERY }),
  );
  await page.route(/\/api\/v1\/nodes\/[^/?]+(?:\?|$)/, (route) =>
    route.fulfill({ json: NODE_PRESENTATION }),
  );
}

test.describe('Evolution public surfaces — Satellite Node local site (flags on)', () => {
  for (const width of WIDTHS) {
    test(`node local site @ ${width}px — renders + no overflow`, async ({ page }) => {
      await mockFlags(page);
      await mockAuth(page);
      await mockNode(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/n/lk-colombo?evo=on');
      await page
        .getByText('Singha Colombo', { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(500);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await page.screenshot({ path: `${SHOT_DIR}/node-local-site-${width}.png`, fullPage: true });
    });
  }
});

/* ------------------------------ IA editorial entry pages ------------------------------ */
// Public editorial pages whose flag-gated `EvolutionEntryLinks` reveal the live surfaces. Waiting on
// a gated link proves the links render post-mount without a hydration mismatch; mobile + desktop are
// enough for these simple text/card layouts (the 7-width sweep is on the data-dense surfaces above).
const ENTRY_PAGES = [
  { path: '/exchange', slug: 'exchange', anchor: 'Post an RFQ' },
  { path: '/wanted', slug: 'wanted', anchor: 'Post a request for quote' },
  { path: '/services', slug: 'services', anchor: 'Logistics: Incoterms, quotes & tracking' },
];

test.describe('Evolution public surfaces — IA entry pages (flags on)', () => {
  for (const { path, slug, anchor } of ENTRY_PAGES) {
    for (const width of [390, 1440]) {
      test(`entry ${path} @ ${width}px — gated links + no overflow`, async ({ page }) => {
        await mockFlags(page);
        await mockAuth(page);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${path}?evo=on`);
        await page
          .getByText(anchor, { exact: false })
          .first()
          .waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(400);
        expect(await noHorizontalOverflow(page)).toBe(true);
        await page.screenshot({ path: `${SHOT_DIR}/entry-${slug}-${width}.png`, fullPage: true });
      });
    }
  }
});
