import { expect, test, type Page } from '@playwright/test';

const SITE = 'https://nicoloboni.github.io';
const meta = (page: Page, key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).getAttribute('content');

test('the home describes itself to search engines and link previews', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`);
  expect(await meta(page, 'og:title')).toBe('Nicolò Boni, developer and designer');
  expect(await meta(page, 'og:description')).toBe(await meta(page, 'description'));
  expect(await meta(page, 'og:url')).toBe(`${SITE}/`);
  expect(await meta(page, 'twitter:card')).toBe('summary_large_image');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  // The card is an absolute URL on the site, served by this build at 1200x630.
  const card = (await meta(page, 'og:image'))!;
  expect(card.startsWith(`${SITE}/_astro/`)).toBe(true);
  const res = await request.get(new URL(card).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/jpeg');
  const size = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, new URL(card).pathname);
  expect(size).toEqual([1200, 630]);

  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute('type', 'image/svg+xml');
  expect((await request.get((await icon.getAttribute('href'))!)).status()).toBe(200);
});

test('an unknown address answers 404 with the name, one line and the way home', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.locator('main h1')).toHaveText('There is no page at this address.');
  await expect(page.locator('main .name')).toHaveText('Nicolò Boni');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to the home page' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.hero h1')).toHaveAttribute('aria-label', 'Nicolò Boni');
});

test('every internal link of the built pages leads somewhere', async ({ page, request }) => {
  const seen = new Set<string>();
  const queue = ['/', '/404'];
  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    await page.goto(path);
    const links = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of links) {
      if (/^https?:\/\//.test(href)) continue;
      const url = new URL(href, `http://x${path}`);
      if (url.hash && url.pathname === new URL(`http://x${path}`).pathname) {
        expect(await page.locator(url.hash).count(), `${href} on ${path}`).toBe(1);
      } else {
        expect((await request.get(url.pathname)).status(), `${href} on ${path}`).toBe(200);
        if (!seen.has(url.pathname)) queue.push(url.pathname);
      }
    }
  }
  console.log(`internal links checked on ${[...seen].join(', ')}`);
});
