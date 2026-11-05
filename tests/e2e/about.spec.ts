import { expect, test, type Page } from '@playwright/test';

const paragraphs = (page: Page) => page.locator('.about .copy p').evaluateAll((ps) => ps.map((p) => p.querySelector('.visually-hidden')!.textContent!.trim()));

test('two paragraphs of at most 90 words, at most 12 pills drawn with the thread', async ({ page }) => {
  await page.goto('/');
  const text = await paragraphs(page);
  const words = text.join(' ').split(/\s+/).length;
  console.log(`about: ${text.length} paragraphs, ${words} words`);
  expect(text).toHaveLength(2);
  expect(words).toBeLessThanOrEqual(90);
  const pills = page.locator('.about .pills li');
  expect(await pills.count()).toBeLessThanOrEqual(12);
  const pill = await pills.first().evaluate((e) => ({ border: getComputedStyle(e).borderTopWidth, color: getComputedStyle(e).borderTopColor, bg: getComputedStyle(e).backgroundColor }));
  const rule = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--rule').trim());
  expect(pill).toEqual({ border: rule, color: 'rgb(13, 17, 23)', bg: 'rgba(0, 0, 0, 0)' });
});

test('screen readers get each paragraph whole, not line by line', async ({ page }) => {
  await page.goto('/');
  await page.locator('.about').evaluate((e) => e.scrollIntoView());
  // Split into masked lines by now...
  await expect.poll(() => page.locator('.about [data-lines] div').count()).toBeGreaterThan(2);
  // ...yet the accessibility tree holds each sentence once, unbroken.
  const snapshot = await page.locator('.about .copy').ariaSnapshot();
  for (const p of await paragraphs(page)) expect(snapshot).toContain(p);
  expect(await page.locator('.about [data-lines]').evaluateAll((els) => els.every((e) => e.getAttribute('aria-hidden') === 'true'))).toBe(true);
});

test('lines rise from their masks as the text comes on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const lines = page.locator('.about [data-lines]').first().locator(':scope > div > div');
  await expect.poll(() => lines.count()).toBeGreaterThan(1);
  const offsets = () => lines.evaluateAll((els) => els.map((e) => { const t = getComputedStyle(e).transform; return t === 'none' ? 0 : Math.round(new DOMMatrix(t).m42); }));
  expect((await offsets()).every((y) => y > 0), 'below their masks before scrolling').toBe(true);
  await page.locator('.about [data-lines]').first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await expect.poll(offsets, { timeout: 4000 }).toEqual((await offsets()).map(() => 0));
  // A resize re-splits the lines (autoSplit): the text already shown must stay in place.
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.waitForTimeout(600);
  expect(await offsets()).toEqual((await offsets()).map(() => 0));
  const sep = await page.locator('.about .rule').evaluate((e) => getComputedStyle(e).animationTimeline);
  expect(sep).toBe('view()');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the text is whole and visible, the thread is still', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('.about [data-lines]');
    await page.waitForLoadState('load');
    const state = await page.locator('.about [data-lines]').evaluateAll((els) => els.map((e) => ({ children: e.children.length, text: e.textContent!.trim(), opacity: getComputedStyle(e).opacity })));
    const text = await paragraphs(page);
    expect(state).toEqual(text.map((t) => ({ children: 0, text: t, opacity: '1' })));
    expect(await page.locator('.about .rule').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  });
});
