// Runs on the dev server: the gallery pieces today are local `pending` placeholders, which
// production leaves out. On a clone without them there is no gallery and these tests skip.
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  test.skip((await page.locator('.gallery .tile').count()) < 6, 'needs the local placeholder pieces');
});

const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function scrollToY(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await settle(page);
  await page.waitForTimeout(150);
}

const trackX = (page: Page) =>
  page.locator('.gallery .track').evaluateAll((els) => els.map((e) => { const t = getComputedStyle(e).transform; return t === 'none' ? 0 : new DOMMatrix(t).m41; }));

test.describe('at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('ribbons slide sideways with the scroll, opposite ways, by at most 30% of their length', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => window.__motion?.active)).toBe(1);
    const top = await page.locator('.gallery .ribbon').first().evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const widths = await page.locator('.gallery .track').evaluateAll((els) => els.map((e) => e.scrollWidth));
    const samples: number[][] = [];
    for (const y of [top - 900, top - 450, top, top + 300]) {
      await scrollToY(page, y);
      samples.push(await trackX(page));
    }
    console.log(`ribbons 1440: x per step ${samples.map((s) => s.map((x) => x.toFixed(0)).join('/')).join(', ')}; widths ${widths.join('/')}`);
    // First ribbon moves left (x falls), the second moves right (x rises), steadily.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i][0]).toBeLessThan(samples[i - 1][0]);
      expect(samples[i][1]).toBeGreaterThan(samples[i - 1][1]);
    }
    for (const [i, w] of widths.entries()) {
      for (const s of samples) expect(Math.abs(s[i])).toBeLessThanOrEqual(w * 0.3 + 1);
    }
  });

  test('a video plays only while on screen, muted and inline', async ({ page }) => {
    const video = page.locator('.gallery video').first();
    expect(await video.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, inline: v.playsInline, auto: v.autoplay }))).toEqual({ muted: true, inline: true, auto: false });
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await video.evaluate((v) => v.scrollIntoView({ block: 'center' }));
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    await scrollToY(page, 0);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test('bar 3 on the gallery head and bar 7 gap', async ({ page }) => {
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const h2 = document.querySelector<HTMLElement>('.gallery h2')!;
      const p = document.querySelector<HTMLElement>('.gallery .head p')!;
      const body = parseFloat(getComputedStyle(document.body).fontSize);
      return {
        ratio: parseFloat(getComputedStyle(h2).fontSize) / body,
        lines: Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)),
        gap: parseFloat(getComputedStyle(document.querySelector('.gallery')!).paddingTop),
      };
    });
    console.log(`gallery 1440: title ${m.ratio.toFixed(2)}x body, description ${m.lines} lines, gap ${m.gap.toFixed(0)}px`);
    expect(m.ratio).toBeGreaterThanOrEqual(5);
    expect(m.lines).toBe(2);
    expect(m.gap).toBeGreaterThanOrEqual(300);
  });

  test('media weight of the gallery', async ({ page }) => {
    await page.locator('.gallery').evaluate((e) => e.scrollIntoView());
    await page.locator('.gallery .ribbon').last().evaluate((e) => e.scrollIntoView());
    await page.waitForLoadState('networkidle');
    const bytes = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((r) => /pieces|placeholder/.test(r.name))
        .map((r) => ({ name: decodeURIComponent(r.name).replace(/.*\//, '').slice(0, 60), kb: Math.round((r as PerformanceResourceTiming).encodedBodySize / 1024) })),
    );
    console.log(`gallery media 1440: ${bytes.length} files, ${bytes.reduce((n, b) => n + b.kb, 0)} KB (${bytes.map((b) => b.kb).join(' + ')})`);
    expect(bytes.length).toBeGreaterThan(0);
  });
});

test.describe('at 375', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('each ribbon is a column of full-width pieces with its name held at the top', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const ribbon = page.locator('.gallery .ribbon').first();
    const { top, height } = await ribbon.evaluate((e) => ({ top: e.getBoundingClientRect().top + scrollY, height: e.getBoundingClientRect().height }));
    await scrollToY(page, top + height / 2);
    const label = await ribbon.locator('.label').evaluate((e) => e.getBoundingClientRect().top);
    const tiles = await ribbon.locator('.tile').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    console.log(`ribbons 375: label top ${label.toFixed(0)}px mid-column, tile width ${tiles[0].width.toFixed(0)}px`);
    expect(label).toBeCloseTo(0, 0);
    for (let i = 1; i < tiles.length; i++) expect(tiles[i].top).toBeGreaterThan(tiles[i - 1].bottom);
    for (const t of tiles) expect(t.width).toBeCloseTo(375 - 32, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });

  test('ribbons wrap in place and videos rest on the poster', async ({ page }) => {
    const video = page.locator('.gallery video').first();
    await video.evaluate((v) => v.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(800);
    expect(await video.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, t: v.currentTime }))).toEqual({ paused: true, t: 0 });
    expect(await trackX(page)).toEqual([0, 0]);
    // Every piece is inside the page: nothing waits for a slide that never comes.
    const outside = await page.locator('.gallery .tile').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().right > innerWidth).length);
    expect(outside).toBe(0);
  });
});
