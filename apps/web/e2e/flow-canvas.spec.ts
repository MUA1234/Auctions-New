import { test, expect, type Page } from '@playwright/test';

/**
 * V3 Infinite Flow Canvas acceptance (pack docs 08/20). The canvas is behind the
 * server flag `flowMatrixV3`, so each test forces it on. Catalogue + row data are
 * mocked so the test is hermetic (a client-side fetch from localhost to the prod
 * backend is CORS-blocked, and we want to assert the canvas itself, not the data).
 * Acceptance: the compact matrix reaches 4 columns on a phone, more on desktop,
 * and the document never overflows horizontally.
 */
type Card = Record<string, unknown>;
function card(cat: string, i: number): Card {
  return {
    id: `${cat}-${i}`,
    reference: `LOT-${cat}-${i}`,
    title: `${cat} lot ${i}`,
    category: cat,
    saleMethod: 'TIMED_AUCTION',
    status: 'live',
    featured: false,
    watchers: 0,
    media: { videoAvailable: false },
    commercial: {
      kind: 'auction',
      currency: 'LKR',
      openingBidMinor: 100000,
      currentBidMinor: 150000,
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      extendedCount: 0,
    },
  };
}

async function mockFlow(page: Page) {
  await page.route('**/feature-flags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ features: { flowMatrixV3: true } }),
    }),
  );
  await page.route(/\/api\/v2\/catalogue\?/, (route) =>
    route.fulfill({
      json: {
        items: [card('vehicles', 0), card('machinery', 0)],
        page: 1,
        limit: 24,
        total: 14,
        totalPages: 1,
        facets: {
          category: [
            { value: 'vehicles', count: 8 },
            { value: 'machinery', count: 6 },
          ],
          saleMethod: [{ value: 'TIMED_AUCTION', count: 14 }],
          status: [{ value: 'live', count: 14 }],
        },
      },
    }),
  );
  await page.route(/\/api\/v2\/catalogue\/row/, (route) => {
    const cat = new URL(route.request().url()).searchParams.get('category') ?? 'vehicles';
    route.fulfill({
      json: {
        category: cat,
        items: Array.from({ length: 18 }, (_, i) => card(cat, i)),
        nextCursor: null,
        exhausted: true,
      },
    });
  });
}

async function firstBandColumns(page: Page): Promise<number> {
  const grid = page.locator('[data-band] .grid').first();
  await grid.waitFor({ state: 'visible', timeout: 20_000 });
  return grid.evaluate(
    (el) => getComputedStyle(el as HTMLElement).gridTemplateColumns.split(' ').length,
  );
}

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

test.describe('V3 Infinite Flow Canvas', () => {
  test('mobile 390px: compact 4-column matrix, no horizontal overflow', async ({ page }) => {
    await mockFlow(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/catalogue');

    expect(await firstBandColumns(page)).toBe(4);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('desktop 1440px: denser matrix than mobile, still no overflow', async ({ page }) => {
    await mockFlow(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/catalogue');

    expect(await firstBandColumns(page)).toBeGreaterThanOrEqual(5);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});
