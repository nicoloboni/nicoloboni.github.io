import { expect, test, type Page } from '@playwright/test';

const toBottom = async (page: Page) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(300);
};

const nameState = (page: Page) =>
  page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('.footer .fit')!).transform;
    return {
      y: t === 'none' ? 0 : Math.round(new DOMMatrix(t).m42),
      aurora: Number(getComputedStyle(document.querySelector('.footer .aurora')!).opacity),
    };
  });

for (const vp of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test.describe(`footer at ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('bar 5: name edge to edge under a thread and 3-4 columns of small text', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await toBottom(page);
      const m = await page.evaluate(() => {
        const fit = document.querySelector('.footer .fit')!;
        const range = document.createRange();
        range.selectNodeContents(fit);
        const name = range.getBoundingClientRect();
        const rule = document.querySelector('.footer .rule')!.getBoundingClientRect();
        const cols = [...document.querySelectorAll('.footer .cols > div')];
        return {
          ratio: name.width / document.documentElement.clientWidth,
          left: name.left,
          right: document.documentElement.clientWidth - name.right,
          ruleAboveCols: cols.every((c) => c.getBoundingClientRect().top >= rule.bottom),
          // The line box, not the text range: at line-height 0.82 the font's em box overflows it.
          nameBelowCols: cols.every((c) => c.getBoundingClientRect().bottom <= fit.getBoundingClientRect().top),
          cols: cols.length,
          size: Math.max(...cols.map((c) => parseFloat(getComputedStyle(c).fontSize))),
          ruleColor: getComputedStyle(document.querySelector('.footer .rule')!).backgroundColor,
        };
      });
      console.log(`bar5 ${vp.width}: name ${(m.ratio * 100).toFixed(1)}% of the page, ${m.cols} columns at ${m.size}px`);
      expect(m.ratio).toBeGreaterThanOrEqual(0.95);
      expect(m.left).toBeGreaterThanOrEqual(0);
      expect(m.right).toBeGreaterThanOrEqual(0);
      expect(m.ruleAboveCols).toBe(true);
      expect(m.nameBelowCols).toBe(true);
      expect(m.cols).toBeGreaterThanOrEqual(3);
      expect(m.cols).toBeLessThanOrEqual(4);
      expect(m.size).toBeLessThan(18);
      expect(m.ruleColor).toBe('rgb(255, 255, 255)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    });

    test('the name rises and the aurora lights up with the scroll, in place at the bottom', async ({ page }) => {
      await page.goto('/');
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(true);
      const before = await nameState(page);
      await toBottom(page);
      const after = await nameState(page);
      console.log(`footer ${vp.width}: name y ${before.y} → ${after.y}px, aurora ${before.aurora} → ${after.aurora}`);
      expect(before.y).toBeGreaterThan(0);
      expect(before.aurora).toBe(0);
      // The light peaks at 0.8, the CSS value: full strength put "Boni" under 4.5:1.
      expect(after).toEqual({ y: 0, aurora: 0.8 });
    });
  });
}

test('links are real, reachable and at least 44 px tall', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.footer a');
  expect(await links.count()).toBeGreaterThan(0);
  for (const l of await links.all()) {
    expect(await l.getAttribute('href')).toMatch(/^(https:\/\/github\.com\/nicoloboni|mailto:)/);
    expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('name in place and aurora lit from the first frame', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    expect(await nameState(page)).toEqual({ y: 0, aurora: 0.8 });
    expect(await page.locator('.footer .aurora i').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  });
});
