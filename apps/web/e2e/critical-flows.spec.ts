import { test, expect } from '@playwright/test';

/**
 * Critical-flow browser E2E (Revision 06.1 §18/§20, P1-14): the catalogue Flow
 * never blanks and never overflows, Flow is the default with working Grid/List
 * switching, and Bid Capacity is a distinct surface from account security.
 */

test.describe('Singha critical flows', () => {
  test('home renders and links to the catalogue', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /explore catalogue/i }).first()).toBeVisible();
  });

  test('catalogue: Flow is default, no blank, no horizontal overflow, Grid/List switch', async ({
    page,
  }) => {
    await page.goto('/catalogue');

    // Flow is the default selected view.
    const flow = page.getByRole('button', { name: 'Flow', exact: true });
    await expect(flow).toHaveAttribute('aria-pressed', 'true');

    // The catalogue must never be a permanent blank — a status line or the Flow
    // helper is always present even before/without data.
    await expect(page.getByText(/lots|loading|no lots|browse in flow/i).first()).toBeVisible();

    // Flow geometry must not cause horizontal document overflow (§28).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBe(false);

    // Grid → List switching works and stays on the catalogue.
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('catalogue: a selected category filter persists across a Flow→Grid switch', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    // The first category facet chip after "All", if the public catalogue has any.
    const chips = page.locator('button.rounded-full', { hasText: /\(\d+\)/ });
    const count = await chips.count();
    test.skip(count === 0, 'no category facets in the public catalogue to filter by');

    const chip = chips.first();
    const label = (await chip.innerText()).replace(/\s*\(\d+\).*/, '').trim();
    await chip.click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();

    // The same category chip is still the active filter after the view switch.
    const active = page.locator('button.rounded-full', { hasText: label }).first();
    await expect(active).toHaveClass(/bg-red-500\/10|border-red-500/);
  });

  test('Bid Capacity is a distinct page from account security (P1-12)', async ({ page }) => {
    await page.goto('/account/bid-capacity');
    await expect(page.getByRole('heading', { name: /bid capacity/i })).toBeVisible();
    // It links to account security (MFA) — the two are separate surfaces.
    await expect(page.getByRole('link', { name: /account security/i })).toBeVisible();

    // /account/security is the account-security / MFA page, not the capacity page.
    // (Signed out it shows the sign-in prompt; signed in, MFA enrollment — both
    // are the security surface, never Bid Capacity.)
    await page.goto('/account/security');
    await expect(page.getByRole('heading', { name: /account security/i })).toBeVisible();
    await expect(
      page.getByText(/multi-factor|authenticator|manage your account security/i).first(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /bid capacity/i })).toHaveCount(0);
  });
});
