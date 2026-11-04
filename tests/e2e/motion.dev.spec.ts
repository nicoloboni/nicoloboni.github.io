import { expect, test, type Page } from '@playwright/test';

const probe = (page: Page) => page.evaluate(() => window.__motion ?? null);

/** Runs a navigation and resolves once the ClientRouter has finished swapping the page. */
async function afterPageLoad(page: Page, navigate: () => Promise<unknown>) {
  await page.evaluate(() => {
    (window as Window & { __loaded?: boolean }).__loaded = false;
    document.addEventListener('astro:page-load', () => ((window as Window & { __loaded?: boolean }).__loaded = true), {
      once: true,
    });
  });
  await navigate();
  await page.waitForFunction(() => (window as Window & { __loaded?: boolean }).__loaded === true);
}

/** A client-side navigation through the ClientRouter (an injected link, so no page is needed). */
async function softNavigate(page: Page, href: string) {
  await page.evaluate((h) => {
    const a = Object.assign(document.createElement('a'), { href: h, textContent: 'go', id: 'probe-link' });
    a.style.cssText = 'position:fixed;top:0;left:0;z-index:999';
    document.body.append(a);
  }, href);
  await afterPageLoad(page, () => page.click('#probe-link'));
}

const goBack = (page: Page) => afterPageLoad(page, () => page.goBack());

test('one motion cycle after navigating forward and back twice', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  // One scroll trigger per card that gets covered by the next one.
  const triggers = Math.max(0, (await page.locator('.work .card').count()) - 1);
  await expect.poll(() => probe(page)).toEqual({ active: 1, inits: 1, lenis: 1, triggers });

  await softNavigate(page, '/?n=1');
  await goBack(page);
  await softNavigate(page, '/?n=2');
  await goBack(page);
  // Each of the 4 navigations tore the old cycle down and built a new one: still one alive.
  await expect.poll(() => probe(page)).toEqual({ active: 1, inits: 5, lenis: 1, triggers });

  // Lenis marks <html> while it is alive.
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(true);
  await expect.poll(() => page.locator('.hero .line').evaluateAll((els) => els.map((e) => { const t = getComputedStyle(e).transform; return t === 'none' || new DOMMatrix(t).isIdentity ? 'none' : t; }))).toEqual([
    'none',
    'none',
  ]);
  expect(errors).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Lenis is never created', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => probe(page)).toEqual({ active: 1, inits: 1, lenis: 0, triggers: 0 });
    expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
    await softNavigate(page, '/?n=1');
    await expect.poll(() => probe(page)).toEqual({ active: 1, inits: 2, lenis: 0, triggers: 0 });
  });
});
