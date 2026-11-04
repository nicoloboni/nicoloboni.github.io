// Production build: both projects are `pending`, so there is no work to show.
import { expect, test } from '@playwright/test';

test('no Selected work section and no Work link when no project is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.work')).toHaveCount(0);
  await expect(page.locator('#work')).toHaveCount(0);
  await expect(page.locator('.hero nav')).toHaveCount(0);
  await expect(page.locator('a[href="/work"]')).toHaveCount(0);
});
