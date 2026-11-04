import { expect, test, type Page } from '@playwright/test';

const bodySize = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));

/** Cap height of the first name line, measured on the glyph with the loaded font. */
const capHeight = (page: Page) =>
  page.evaluate(() => {
    const l1 = document.querySelector<HTMLElement>('.hero .l1')!;
    const cs = getComputedStyle(l1);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return ctx.measureText('N').actualBoundingBoxAscent;
  });

const widestLineRatio = (page: Page) =>
  page.evaluate(() => {
    const widths = [...document.querySelectorAll<HTMLElement>('.hero .line')].map((e) => e.getBoundingClientRect().width);
    return Math.max(...widths) / document.documentElement.clientWidth;
  });

for (const vp of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test.describe(`hero at ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('bar 1: two lines, Bricolage 800 then Instrument Serif, widest ≥ 60% of the page', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const lines = page.locator('.hero .line');
      await expect(lines).toHaveText(['Nicolò', 'Boni']);
      const [l1, l2] = await lines.evaluateAll((els) =>
        els.map((e) => ({ family: getComputedStyle(e).fontFamily, weight: getComputedStyle(e).fontWeight })),
      );
      expect(l1.family).toContain('Bricolage Grotesque Variable');
      expect(l1.weight).toBe('800');
      expect(l2.family).toContain('Instrument Serif');
      expect(l2.weight).toBe('400');
      const ratio = await widestLineRatio(page);
      console.log(`bar1 ${vp.width}: widest line ${(ratio * 100).toFixed(1)}% of page`);
      expect(ratio).toBeGreaterThanOrEqual(0.6);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    test('bar 2: cap height vs body, one sentence of ≤ 15 words at body size', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const body = await bodySize(page);
      const cap = await capHeight(page);
      console.log(`bar2 ${vp.width}: cap ${cap.toFixed(1)}px / body ${body}px = ${(cap / body).toFixed(2)}x`);
      // 8x is reachable only on wide screens: at 375 px "Nicolò" on one line caps out at ~5.3x
      // (content width 343 px). Spec issue reported to Nicolò; the phone floor is 5x.
      expect(cap / body).toBeGreaterThanOrEqual(vp.width >= 768 ? 8 : 5);
      const lede = page.locator('.hero .lede');
      const text = (await lede.innerText()).trim();
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(15);
      // One sentence: a single terminator, at the end.
      expect(text.match(/[.!?]/g)).toEqual(['.']);
      expect(text.endsWith('.')).toBe(true);
      expect(await lede.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(body);
    });

    test('bar 7: side margin', async ({ page }) => {
      await page.goto('/');
      const left = await page.locator('.hero .body').evaluate((e) => parseFloat(getComputedStyle(e).paddingLeft));
      console.log(`bar7 ${vp.width}: gutter ${left}px (${((left / vp.width) * 100).toFixed(1)}%)`);
      if (vp.width >= 768) expect(Math.abs(left / vp.width - 0.04)).toBeLessThan(0.005);
      else expect(left).toBeGreaterThanOrEqual(16);
    });

    test('no glyph is clipped by its mask', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.locator('.hero .line').evaluateAll((els) => els.map((e) => { const t = getComputedStyle(e).transform; return t === 'none' || new DOMMatrix(t).isIdentity ? 'none' : t; })))
        .toEqual(['none', 'none']);
      // Ink box of each line, from the glyph metrics, against the box of the mask that clips it.
      const gaps = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.hero .mask')].map((mask) => {
          const line = mask.querySelector<HTMLElement>('.line')!;
          const cs = getComputedStyle(line);
          const ctx = document.createElement('canvas').getContext('2d')!;
          ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          ctx.letterSpacing = cs.letterSpacing;
          const m = ctx.measureText(line.textContent!);
          const probe = document.createElement('span');
          probe.style.cssText = 'display:inline-block;width:0;height:0';
          line.append(probe);
          const baseline = probe.getBoundingClientRect().bottom;
          probe.remove();
          const lr = line.getBoundingClientRect();
          const mr = mask.getBoundingClientRect();
          return {
            text: line.textContent,
            left: lr.left - m.actualBoundingBoxLeft - mr.left,
            right: mr.right - (lr.left + m.actualBoundingBoxRight),
            top: baseline - m.actualBoundingBoxAscent - mr.top,
            bottom: mr.bottom - (baseline + m.actualBoundingBoxDescent),
          };
        }),
      );
      console.log(`ink ${vp.width}: ${gaps.map((g) => `${g.text} right ${g.right.toFixed(1)}px top ${g.top.toFixed(1)}px`).join(', ')}`);
      for (const g of gaps) {
        for (const side of ['left', 'right', 'top', 'bottom'] as const) {
          expect(g[side], `${g.text}: ink outside the mask on the ${side}`).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('no horizontal scroll', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    });
  });
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('lines in place on the first frame, aurora still', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('.hero .l2');
    const state = await page.evaluate(() => ({
      entrance: [...document.querySelectorAll('.hero .line')].map((e) => getComputedStyle(e).animationName),
      transforms: [...document.querySelectorAll('.hero .line')].map((e) => getComputedStyle(e).transform),
      aurora: [...document.querySelectorAll('.aurora i')].map((e) => getComputedStyle(e).animationName),
      surnameLight: getComputedStyle(document.querySelector('.hero .l2')!).animationName,
    }));
    expect(state.entrance).toEqual(['none', 'none']);
    expect(state.transforms).toEqual(['none', 'none']);
    expect(state.aurora).toEqual(['none', 'none', 'none']);
    expect(state.surnameLight).toBe('none');
  });
});

test('with motion the lines rise and end in place', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('.hero .l2');
  // The CSS entrance really runs: on the first frames at least one line is still below its mask,
  // with no script involved. A finished fill-mode animation leaves the identity matrix: same as none.
  const atStart = await page.locator('.hero .line').evaluateAll((els) => els.map((e) => { const t = getComputedStyle(e).transform; return t === 'none' || new DOMMatrix(t).isIdentity ? 'none' : t; }));
  expect(atStart.some((t) => t !== 'none')).toBe(true);
  const entrance = await page.locator('.hero .line').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName.split(',')[0].trim()));
  expect(entrance).toEqual(['line-rise', 'line-rise']);
  await expect
    .poll(() => page.locator('.hero .line').evaluateAll((els) => els.map((e) => { const t = getComputedStyle(e).transform; return t === 'none' || new DOMMatrix(t).isIdentity ? 'none' : t; })))
    .toEqual(['none', 'none']);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.aurora i')!).animationName)).toBe('aurora-drift');
  // The surname is made of the aurora's light, drifting with it.
  const l2 = await page.locator('.hero .l2').evaluate((e) => {
    const cs = getComputedStyle(e);
    return { anim: cs.animationName, clip: cs.backgroundClip || cs.getPropertyValue('-webkit-background-clip'), fill: cs.getPropertyValue('-webkit-text-fill-color') };
  });
  expect(l2.anim).toBe('line-rise, name-light');
  // One value per background layer: every layer is clipped to the letters.
  expect(l2.clip.split(/,\s*/).every((v) => v === 'text')).toBe(true);
  expect(l2.fill).toBe('rgba(0, 0, 0, 0)');
});
