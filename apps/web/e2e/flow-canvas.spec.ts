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

async function firstRail(page: Page) {
  const rail = page.locator('[data-band] [data-rail]').first();
  await rail.waitFor({ state: 'visible', timeout: 20_000 });
  return rail;
}

/** Every cell in a rail must sit on ONE horizontal line (single row per category). */
async function railIsSingleRow(page: Page): Promise<boolean> {
  return (await firstRail(page)).evaluate((el) => {
    const cells = Array.from((el as HTMLElement).children).filter(
      (c) => (c as HTMLElement).offsetWidth > 0,
    );
    if (cells.length < 2) return true;
    const top = (cells[0] as HTMLElement).offsetTop;
    return cells.every((c) => Math.abs((c as HTMLElement).offsetTop - top) <= 1);
  });
}

async function railScrollsHorizontally(page: Page): Promise<boolean> {
  return (await firstRail(page)).evaluate((el) => el.scrollWidth > el.clientWidth + 1);
}

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

test.describe('V3 Infinite Flow Canvas', () => {
  test('mobile 390px: single horizontal rail per category, scrolls, no page overflow', async ({
    page,
  }) => {
    await mockFlow(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/catalogue');

    await firstRail(page);
    expect(await railIsSingleRow(page)).toBe(true); // one line, not many rows
    expect(await railScrollsHorizontally(page)).toBe(true); // 18 lots > one screen
    expect(await noHorizontalOverflow(page)).toBe(true); // rail scroll ≠ page scroll
  });

  test('desktop 1440px: still a single horizontal rail, no page overflow', async ({ page }) => {
    await mockFlow(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/catalogue');

    await firstRail(page);
    expect(await railIsSingleRow(page)).toBe(true);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});
