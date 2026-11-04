// Runs on the dev server: the only projects today are `pending`, which production leaves out.
// They are git-ignored, so on a clone without them there is no section and these tests skip.
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  test.skip((await page.locator('.work .card').count()) < 2, 'needs at least two local projects');
});

const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await settle(page);
  await page.waitForTimeout(150);
}

const scaleOf = (page: Page, nth: number) =>
  page.locator('.work .card .inner').nth(nth).evaluate((e) => {
    const t = getComputedStyle(e).transform;
    return t === 'none' ? 1 : new DOMMatrix(t).a;
  });

test.describe('at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('bar 3: title ≥ 5x body, two-line description on the right, same baseline', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const h2 = document.querySelector<HTMLElement>('.work h2')!;
      const p = document.querySelector<HTMLElement>('.work .head p')!;
      const body = parseFloat(getComputedStyle(document.body).fontSize);
      // Baseline of the last line: a zero-size inline-block probe sits on it.
      const baseline = (el: HTMLElement) => {
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        el.append(probe);
        const y = probe.getBoundingClientRect().bottom;
        probe.remove();
        return y;
      };
      const lh = parseFloat(getComputedStyle(p).lineHeight);
      return {
        ratio: parseFloat(getComputedStyle(h2).fontSize) / body,
        h2Left: h2.getBoundingClientRect().left,
        gutter: parseFloat(getComputedStyle(document.querySelector('.work')!).paddingLeft),
        pLeft: p.getBoundingClientRect().left,
        pFont: parseFloat(getComputedStyle(p).fontSize),
        body,
        lines: Math.round(p.getBoundingClientRect().height / lh),
        baselineGap: Math.abs(baseline(h2) - baseline(p)),
        text: h2.textContent,
      };
    });
    console.log(`bar3 1440: title ${m.ratio.toFixed(2)}x body, ${m.lines} lines, baseline gap ${m.baselineGap.toFixed(1)}px`);
    expect(m.text).toBe('Selected work');
    expect(m.ratio).toBeGreaterThanOrEqual(5);
    expect(m.h2Left).toBeCloseTo(m.gutter, 0);
    expect(m.pLeft).toBeGreaterThan(720);
    expect(m.pFont).toBe(m.body);
    expect(m.lines).toBe(2);
    expect(m.baselineGap).toBeLessThanOrEqual(1);
  });

  test('bar 4: borderless images, two small lines, one "All projects" action with arrow and count', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.work .card');
    await expect(cards).toHaveCount(2);
    const styles = await page.locator('.work .card img').evaluateAll((imgs) =>
      imgs.map((img) => {
        const chain = [img, img.parentElement!, img.closest('.card')!];
        return chain.map((e) => {
          const cs = getComputedStyle(e);
          return `${cs.borderTopWidth} ${cs.borderBottomWidth} ${cs.boxShadow} ${cs.outlineStyle}`;
        });
      }),
    );
    for (const s of styles.flat()) expect(s).toBe('0px 0px none none');
    const cap = page.locator('.work .card .cap').first();
    await expect(cap.locator('span').first()).not.toBeEmpty();
    await expect(cap.locator('span').nth(1)).toHaveText(/^(Website|Motion|Graphics|Product UI), \d{4}$/);
    const [title, kind] = await cap.locator('span').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    expect(kind.top, 'kind sits on its own line under the title').toBeGreaterThanOrEqual(title.bottom - 1);
    const capSize = await page.locator('.work .cap').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(capSize).toBeLessThan(18);

    const more = page.locator('.work a.more');
    await expect(more).toHaveCount(1);
    await expect(more).toHaveAttribute('href', '/work');
    await expect(more).toHaveText(/^All projects\s*→\s*2$/);
    await expect(more.locator('sup')).toHaveText('2');
    const [label, sup] = await page.evaluate(() => {
      const a = document.querySelector('.work a.more')!;
      const range = document.createRange();
      range.selectNodeContents(a.firstChild!);
      return [range.getBoundingClientRect(), a.querySelector('sup')!.getBoundingClientRect()].map((r) => ({ top: r.top, bottom: r.bottom }));
    });
    expect(sup.top, 'count raised above the label').toBeLessThan(label.top + 2);
    expect(sup.bottom).toBeLessThan(label.bottom - 4);
    // One unbroken underline, under the words only.
    expect(await more.locator('.label').evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe('underline');
    expect(await more.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe('none');
    expect(await more.locator('sup').evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe('none');
  });

  test('bar 7: a third of the screen before the section', async ({ page }) => {
    await page.goto('/');
    const gap = await page.locator('.work').evaluate((e) => parseFloat(getComputedStyle(e).paddingTop));
    console.log(`bar7 1440: section gap ${gap.toFixed(0)}px of ${900}`);
    expect(gap).toBeGreaterThanOrEqual(900 / 3);
  });

  test('the card below scales to 0.94 as the next one slides over, following the scroll', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'run');
    const second = await page.locator('.work .card').nth(1).evaluate((e) => e.getBoundingClientRect().top + scrollY);
    expect(await scaleOf(page, 0)).toBe(1);
    // Halfway through the trigger (next card from viewport bottom to 12% from the top).
    await scrollToY(page, second - 900 + (900 - 108) / 2);
    const mid = await scaleOf(page, 0);
    await scrollToY(page, second - 108 + 40);
    const end = await scaleOf(page, 0);
    console.log(`stack 1440: scale mid ${mid.toFixed(3)}, end ${end.toFixed(3)}`);
    expect(mid).toBeGreaterThan(0.94);
    expect(mid).toBeLessThan(1);
    expect(end).toBeCloseTo(0.94, 3);
    expect(await scaleOf(page, 1)).toBe(1);
  });

  test('a pinned card keeps its caption on screen', async ({ page }) => {
    await page.goto('/');
    const second = await page.locator('.work .card').nth(1).evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await scrollToY(page, second - 900 + 40);
    const box = await page.locator('.work .card .cap').first().boundingBox();
    console.log(`stack 1440: pinned caption bottom ${box!.y + box!.height}px of 900`);
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  });

  test('scale is right after a reload in the middle of the stack', async ({ page }) => {
    await page.goto('/');
    const second = await page.locator('.work .card').nth(1).evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const y = second - 900 + (900 - 108) / 2;
    await scrollToY(page, y);
    const before = await scaleOf(page, 0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'run');
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(Math.round(y));
    await settle(page);
    const after = await scaleOf(page, 0);
    console.log(`stack 1440: scale before reload ${before.toFixed(3)}, after ${after.toFixed(3)} at y ${Math.round(y)}`);
    expect(after).toBeCloseTo(before, 2);
  });
});

test.describe('at 375', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('cards stack: the first stays pinned while the second covers it', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.work .card');
    expect(await card.first().evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
    const second = await card.nth(1).evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await scrollToY(page, second - 812 * 0.3);
    const tops = await card.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
    const stickyTop = 812 * 0.09;
    console.log(`stack 375: card tops ${tops.map((t) => t.toFixed(0)).join(', ')} (sticky at ${stickyTop.toFixed(0)})`);
    expect(tops[0]).toBeCloseTo(stickyTop, 0);
    expect(tops[1]).toBeGreaterThan(tops[0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });

  test('cards in a plain column, never scaled', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.work .card');
    expect(await card.evaluateAll((els) => els.map((e) => getComputedStyle(e).position))).toEqual(['static', 'static']);
    const second = await card.nth(1).evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await scrollToY(page, second - 100);
    expect(await scaleOf(page, 0)).toBe(1);
  });
});
