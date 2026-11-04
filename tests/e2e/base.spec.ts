import { expect, test } from '@playwright/test';

test('no horizontal scroll at 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
});

test('both families are loaded, not their fallbacks', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replaceAll('"', '')),
  );
  expect(loaded).toContain('Bricolage Grotesque Variable');
  expect(loaded).toContain('Instrument Serif');
  expect(await page.evaluate(() => document.fonts.check('800 32px "Bricolage Grotesque Variable"', 'Nicolò'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('400 32px "Instrument Serif"', 'Boni'))).toBe(true);
});

test('skip link is the first tab stop and lands on main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveText('Skip to content');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
