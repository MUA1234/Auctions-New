import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * V3 Flow interaction acceptance (owner feedback pass): the per-band category name must
 *   1. be hidden at rest (never sitting on top of the lots),
 *   2. POP in on mouse-enter / touch, then fade itself back out ~1s later, and
 *   3. the rail must LOOP — an exhausted, reasonably-sized rail duplicates its lots and
 *      wraps at the halfway point so scrolling reads as one endless line.
 *
 * These are the behaviours the owner asked for after seeing the first Flow build; they are
 * asserted here against a real Chromium and a hover screenshot is captured so the popped
 * label is visible in review (a static full-page shot can't show a hover-only element).
 */
const SHOT_DIR = process.env.SHOT_DIR ?? 'v3-screens';
mkdirSync(SHOT_DIR, { recursive: true });

type Card = Record<string, unknown>;
const IDENTIFIERS: Record<string, string[]> = {
  vehicles: ['2018 Toyota Prado', '2016 Nissan Caravan', '2020 Honda Vezel', '2015 Suzuki WagonR'],
  machinery: ['CAT 320D Excavator', 'Komatsu PC200', 'JCB 3DX Backhoe', 'Hitachi ZX130'],
  gems: ['3.2ct Blue Sapphire', '1.8ct Ceylon Ruby', '5ct Star Sapphire', '2ct Yellow Sapphire'],
};
function card(cat: string, i: number): Card {
  const names = IDENTIFIERS[cat] ?? [`${cat} ${i + 1}`];
  return {
    id: `${cat}-${i}`,
    reference: `LOT-${cat}-${i}`,
    title: names[i % names.length],
    category: cat,
    saleMethod: 'TIMED_AUCTION',
    status: 'live',
    featured: i % 5 === 0,
    watchers: i % 7,
    media: { videoAvailable: i % 3 === 0 },
    commercial: {
      kind: 'auction',
      currency: 'LKR',
      openingBidMinor: 100_000_000,
      currentBidMinor: 100_000_000 + i * 5_000_000,
      endsAt: new Date(Date.now() + (i + 1) * 3_600_000).toISOString(),
      extendedCount: 0,
    },
  };
}

const CATS = ['vehicles', 'machinery', 'gems'];

async function mockCatalogue(page: Page, perCat: number) {
  await page.route('**/feature-flags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: { flowMatrixV3: true, categoryOverlayV3: true, v3VisualArchitecture: true },
      }),
    }),
  );
  await page.route(/\/api\/v2\/catalogue\?/, (route) =>
    route.fulfill({
      json: {
        items: CATS.map((c) => card(c, 0)),
        page: 1,
        limit: 24,
        total: CATS.length * perCat,
        totalPages: 1,
        facets: {
          category: CATS.map((c) => ({ value: c, count: perCat })),
          saleMethod: [{ value: 'TIMED_AUCTION', count: CATS.length * perCat }],
          status: [{ value: 'live', count: CATS.length * perCat }],
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

const overlayOpacity = (page: Page) =>
  page
    .locator('[data-band] [aria-hidden] span')
    .first()
    .evaluate((el) => {
      return Number(getComputedStyle(el as HTMLElement).opacity);
    });

test.describe('V3 Flow interactions — label pop-then-fade + looping rail', () => {
  test('category label is hidden at rest, pops on hover, then fades out', async ({ page }) => {
    await mockCatalogue(page, 16);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/catalogue');
    const band = page.locator('[data-band]').first();
    await band.locator('[data-rail]').waitFor({ state: 'visible', timeout: 20_000 });

    // 1. Hidden at rest — the name never sits on the lots.
    expect(await overlayOpacity(page)).toBeLessThan(0.1);

    // 2. Pops in on mouse-enter (settled well before the ~1s auto-hide).
    await band.hover();
    await page.waitForTimeout(600);
    const popped = await overlayOpacity(page);
    expect(popped).toBeGreaterThan(0.4);

    // Capture the popped state for owner review (only visible transiently on hover).
    await page.screenshot({ path: `${SHOT_DIR}/catalogue-label-hover-1440.png`, fullPage: false });

    // 3. Fades itself back out (~1s pop + 0.5s transition) so it stops blocking the row.
    await page.waitForTimeout(1400);
    expect(await overlayOpacity(page)).toBeLessThan(0.1);
  });

  test('an exhausted rail loops: scrolling past halfway wraps seamlessly', async ({ page }) => {
    await mockCatalogue(page, 16);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/catalogue');
    const rail = page.locator('[data-band] [data-rail]').first();
    await rail.waitFor({ state: 'visible', timeout: 20_000 });

    const wrapped = await rail.evaluate((el) => {
      const r = el as HTMLElement;
      const half = r.scrollWidth / 2;
      if (half <= 0 || r.scrollWidth <= r.clientWidth) return null; // not looping/scrollable
      r.scrollLeft = half + 40; // scroll just past the halfway seam
      r.dispatchEvent(new Event('scroll')); // onScroll wraps it back by half
      return { half, after: r.scrollLeft };
    });
    expect(wrapped).not.toBeNull();
    // After the wrap the position is back in the FIRST copy (< half), i.e. it looped.
    expect(wrapped!.after).toBeLessThan(wrapped!.half);
    expect(wrapped!.after).toBeGreaterThanOrEqual(0);
  });
});
