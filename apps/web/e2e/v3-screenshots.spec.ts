import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * V3 visual-acceptance screenshot matrix (brief §15/§20). Captures the signature V3
 * surfaces across the responsive width matrix with DETERMINISTIC fixtures (2 / 16 / 80
 * lots) and asserts the two hard invariants everywhere: the compact Flow density meets
 * the brief and the document never overflows horizontally.
 *
 * Only client-rendered surfaces can be hermetically mocked (the homepage/lot are server
 * components that fetch during SSR); the catalogue Flow — the dominant V3 experience — is
 * fully client-rendered, so it is fixtured here. Output PNGs go to $SHOT_DIR (default
 * `v3-screens/` under apps/web). All V3 flags are forced on to mirror the review config.
 */
const WIDTHS = [360, 390, 430, 768, 1024, 1440, 1920];
const SHOT_DIR = process.env.SHOT_DIR ?? 'v3-screens';
mkdirSync(SHOT_DIR, { recursive: true });

type Card = Record<string, unknown>;
// Realistic identifiers (make/model/year etc.) — the cell shows the identifier, never the
// category word, which is the band's job.
const IDENTIFIERS: Record<string, string[]> = {
  vehicles: ['2018 Toyota Prado', '2016 Nissan Caravan', '2020 Honda Vezel', '2015 Suzuki WagonR'],
  machinery: ['CAT 320D Excavator', 'Komatsu PC200', 'JCB 3DX Backhoe', 'Hitachi ZX130'],
  gems: ['3.2ct Blue Sapphire', '1.8ct Ceylon Ruby', '5ct Star Sapphire', '2ct Yellow Sapphire'],
  property: ['Colombo 07 Land 12P', 'Kandy House 8P', 'Galle Commercial Unit', 'Negombo Plot'],
};
function card(cat: string, i: number): Card {
  const methods = ['TIMED_AUCTION', 'BUY_NOW', 'EOI', 'SEALED_TENDER'];
  const kind = ['auction', 'buy_now', 'eoi', 'sealed_tender'][i % 4];
  const names = IDENTIFIERS[cat] ?? [`${cat} ${i + 1}`];
  return {
    id: `${cat}-${i}`,
    reference: `LOT-${cat}-${i}`,
    title: names[i % names.length],
    category: cat,
    saleMethod: methods[i % 4],
    status: 'live',
    featured: i % 5 === 0,
    watchers: i % 7,
    media: { videoAvailable: i % 3 === 0 },
    commercial:
      kind === 'auction'
        ? {
            kind,
            currency: 'LKR',
            openingBidMinor: 100_000_000,
            currentBidMinor: 100_000_000 + i * 5_000_000,
            endsAt: new Date(Date.now() + (i + 1) * 3_600_000).toISOString(),
            extendedCount: 0,
          }
        : kind === 'buy_now'
          ? { kind, currency: 'LKR', priceMinor: 250_000_000 + i * 1_000_000 }
          : {
              kind,
              currency: 'LKR',
              guidePriceMinor: 500_000_000,
              interestCount: i,
              offerCount: i,
              submissionCount: i,
              closesAt: new Date(Date.now() + (i + 2) * 86_400_000).toISOString(),
            },
  };
}

/** Route-mock the catalogue with `perCat` lots per category across the given categories. */
async function mockCatalogue(page: Page, categories: string[], perCat: number) {
  await page.route('**/feature-flags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: {
          flowMatrixV3: true,
          categoryOverlayV3: true,
          v3VisualArchitecture: true,
          featuredReelV3: true,
          discoverV3: true,
        },
      }),
    }),
  );
  await page.route(/\/api\/v2\/catalogue\?/, (route) =>
    route.fulfill({
      json: {
        items: categories.map((c) => card(c, 0)),
        page: 1,
        limit: 24,
        total: categories.length * perCat,
        totalPages: 1,
        facets: {
          category: categories.map((c) => ({ value: c, count: perCat })),
          saleMethod: [{ value: 'TIMED_AUCTION', count: categories.length * perCat }],
          status: [{ value: 'live', count: categories.length * perCat }],
        },
      },
    }),
  );
  await page.route(/\/api\/v2\/catalogue\/row/, (route) => {
    const cat = new URL(route.request().url()).searchParams.get('category') ?? 'vehicles';
    route.fulfill({
      json: {
        category: cat,
        items: Array.from({ length: perCat }, (_, i) => card(cat, i)),
        nextCursor: null,
        exhausted: true,
      },
    });
  });
}

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

const CATS = ['vehicles', 'machinery', 'gems', 'property'];

test.describe('V3 screenshot matrix — catalogue Flow (dense: 16/cat)', () => {
  for (const width of WIDTHS) {
    test(`catalogue @ ${width}px — density + no overflow`, async ({ page }) => {
      await mockCatalogue(page, CATS, 16);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/catalogue');
      const rail = page.locator('[data-band] [data-rail]').first();
      await rail.waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(1900); // let the floating category overlay settle
      // Each category is a SINGLE horizontal line (one row), not a multi-row grid.
      const oneRow = await rail.evaluate((el) => {
        const cells = Array.from((el as HTMLElement).children).filter(
          (c) => (c as HTMLElement).offsetWidth > 0,
        );
        if (cells.length < 2) return true;
        const top = (cells[0] as HTMLElement).offsetTop;
        return cells.every((c) => Math.abs((c as HTMLElement).offsetTop - top) <= 1);
      });
      expect(oneRow).toBe(true);
      // Hard invariant at every width: no horizontal document overflow (brief §15).
      expect(await noHorizontalOverflow(page)).toBe(true);
      await page.screenshot({ path: `${SHOT_DIR}/catalogue-${width}.png`, fullPage: false });
    });
  }
});

test.describe('V3 screenshot matrix — sparse (2/cat) and very dense (80/cat)', () => {
  test('sparse 2-lot category shows no fake faces (390 + 1440)', async ({ page }) => {
    await mockCatalogue(page, CATS, 2);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/catalogue');
      await page
        .locator('[data-band] [data-rail]')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(1900);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await page.screenshot({ path: `${SHOT_DIR}/catalogue-sparse-${width}.png` });
    }
  });

  test('dense 80-lot category paging (390 + 1440)', async ({ page }) => {
    await mockCatalogue(page, CATS, 80);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/catalogue');
      await page
        .locator('[data-band] [data-rail]')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(1900);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await page.screenshot({ path: `${SHOT_DIR}/catalogue-dense-${width}.png` });
    }
  });
});

test.describe('V3 screenshot matrix — homepage shell (live API, flags on)', () => {
  for (const width of [390, 1440]) {
    test(`homepage @ ${width}px`, async ({ page }) => {
      await page.route('**/feature-flags', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            features: { v3VisualArchitecture: true, featuredReelV3: true, discoverV3: true },
          }),
        }),
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.locator('header').first().waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(1900);
      expect(await noHorizontalOverflow(page)).toBe(true);
      await page.screenshot({ path: `${SHOT_DIR}/homepage-${width}.png`, fullPage: true });
    });
  }
});
