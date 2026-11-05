// Runs on the dev server: the only projects today are local `pending` placeholders.
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  test.skip((await page.locator('.work .card').count()) < 2, 'needs at least two local projects');
});

/** Records every view-transition animation seen while a navigation runs: one rAF loop that
    survives the swap, since the ClientRouter keeps the same document. */
const watchTransitions = (page: Page) =>
  page.evaluate(() => {
    const w = window as Window & { __vt?: Set<string> };
    w.__vt = new Set();
    const loop = () => {
      for (const a of document.getAnimations()) {
        const pseudo = (a.effect as KeyframeEffect | null)?.pseudoElement;
        if (pseudo?.startsWith('::view-transition')) w.__vt!.add(pseudo);
      }
      requestAnimationFrame(loop);
    };
    loop();
  });
const seenTransitions = (page: Page) => page.evaluate(() => [...((window as Window & { __vt?: Set<string> }).__vt ?? [])]);

/** Runs a navigation and resolves once the ClientRouter has finished swapping the page. */
async function afterPageLoad(page: Page, navigate: () => Promise<unknown>) {
  await page.evaluate(() => {
    const w = window as Window & { __loaded?: boolean };
    w.__loaded = false;
    document.addEventListener('astro:page-load', () => (w.__loaded = true), { once: true });
  });
  await navigate();
  await page.waitForFunction(() => (window as Window & { __loaded?: boolean }).__loaded === true);
}

const probe = (page: Page) => page.evaluate(() => window.__motion ?? null);

test('home → project → next → back: no errors, one motion cycle, the cover grows into place', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  const first = page.locator('.work .card a').first();
  const href = await first.getAttribute('href');
  const title = await first.locator('.title').innerText();
  await watchTransitions(page);
  await afterPageLoad(page, () => first.click());
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('main h1')).toHaveText(title);
  // The cover morphs between the two pages: its own view-transition group animates.
  await expect.poll(() => seenTransitions(page)).toContainEqual(expect.stringMatching(/^::view-transition-group\(cover-/));
  await expect.poll(() => probe(page)).toMatchObject({ active: 1, lenis: 1 });

  const next = page.locator('.next a');
  const nextHref = await next.getAttribute('href');
  expect(nextHref).not.toBe(href);
  await afterPageLoad(page, () => next.click());
  await expect(page).toHaveURL(new RegExp(`${nextHref}$`));
  await afterPageLoad(page, () => page.goBack());
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await afterPageLoad(page, () => page.goBack());
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => probe(page)).toMatchObject({ active: 1, inits: 5, lenis: 1 });
  expect(errors).toEqual([]);
});

test('project page: title, year-role-tools row, wide cover, text at most 60 characters a line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const href = await page.locator('.work .card a').first().getAttribute('href');
  await page.goto(href!);
  await page.evaluate(() => document.fonts.ready);
  // Both case studies link to the live site, so the row ends with it.
  await expect(page.locator('.meta dt')).toHaveText(['Year', 'Kind', 'Role', 'Tools', 'Live']);
  await expect(page.locator('.meta dd a')).toHaveAttribute('href', /^https:\/\//);
  const cover = await page.locator('.cover img').boundingBox();
  expect(cover!.width).toBe(1440);
  const longest = await page.evaluate(() => {
    let max = 0;
    for (const p of document.querySelectorAll('.prose p')) {
      const node = [...p.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      if (!node) continue;
      const lines = new Map<number, number>();
      const range = document.createRange();
      for (let i = 0; i < node.textContent!.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const top = Math.round(range.getBoundingClientRect().top);
        lines.set(top, (lines.get(top) ?? 0) + 1);
      }
      max = Math.max(max, ...lines.values());
    }
    return max;
  });
  console.log(`project 1440: longest text line ${longest} characters`);
  expect(longest).toBeGreaterThan(30);
  expect(longest).toBeLessThanOrEqual(60);
});

test('/work lists every project under its kind of work', async ({ page }) => {
  const cards = await page.locator('.work .card a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  await page.goto('/work');
  await expect(page.locator('main h1')).toHaveText('All projects');
  await expect(page.locator('.group h2').first()).toHaveText(/^(Websites|Product interfaces|Motion|Graphics) \d+$/);
  const listed = await page.locator('.group a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(listed.sort()).toEqual(cards.sort());
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('page changes swap with no animation', async ({ page }) => {
    await watchTransitions(page);
    await afterPageLoad(page, () => page.locator('.work .card a').first().click());
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForTimeout(400);
    const running = await page.evaluate(() =>
      document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith('::view-transition') && a.playState === 'running').length,
    );
    const seen = await seenTransitions(page);
    console.log(`reduced motion: view-transition animations seen ${seen.length}`);
    expect(running).toBe(0);
    expect(seen.filter((s) => s.startsWith('::view-transition-group'))).toEqual([]);
  });
});
