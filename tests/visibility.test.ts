import { describe, expect, it } from 'vitest';
import { CLEARANCES, THRESHOLDS, byOrder, filterPublishable, galleryRibbons, isPublishable, type Clearance } from '../src/lib/visibility-rules';
import { referencedVideos } from '../src/lib/piece-video';

const project = (id: string, clearance: Clearance, order = 0) => ({ id, data: { clearance, order } });
const piece = (id: string, ribbon: string) => ({ id, data: { ribbon } });

describe('isPublishable', () => {
  it('excludes pending in production', () => {
    expect(isPublishable('pending', true)).toBe(false);
  });

  it('includes pending in development', () => {
    expect(isPublishable('pending', false)).toBe(true);
  });

  it.each(['granted', 'personal'] as const)('always includes %s', (c) => {
    expect(isPublishable(c, true)).toBe(true);
    expect(isPublishable(c, false)).toBe(true);
  });

  it('covers every clearance value the schema accepts', () => {
    expect([...CLEARANCES].sort()).toEqual(['granted', 'pending', 'personal']);
  });
});

describe('filterPublishable', () => {
  const all = [project('a', 'pending', 2), project('b', 'granted', 3), project('c', 'personal', 1)];

  it('drops only pending projects in production', () => {
    expect(filterPublishable(all, true).map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('keeps everything in development', () => {
    expect(filterPublishable(all, false).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by order', () => {
    expect([...all].sort(byOrder).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('referencedVideos', () => {
  it('finds each piece video a page points to, once, and nothing else', () => {
    const html = `<video poster="/_astro/a.webp"><source src="/media/pieces/loop-1/loop-1.mp4"></video>
      <a href="/media/pieces/loop-1/loop-1.mp4">again</a><source src="/media/pieces/b/b.webm">
      <img src="/media/pieces/c/c.png"><source src="/media/pieces/../x.mp4">`;
    expect(referencedVideos(html)).toEqual([
      { id: 'loop-1', file: 'loop-1.mp4' },
      { id: 'b', file: 'b.webm' },
    ]);
  });
});

describe('galleryRibbons', () => {
  it('uses the thresholds from the spec: gallery from 6 pieces, ribbon from 3', () => {
    expect(THRESHOLDS).toEqual({ gallery: 6, ribbon: 3 });
  });

  it('shows nothing under 6 pieces', () => {
    const five = ['1', '2', '3', '4', '5'].map((i) => piece(i, 'Motion'));
    expect(galleryRibbons(five)).toEqual([]);
  });

  it('shows a single ribbon of 6', () => {
    const six = ['1', '2', '3', '4', '5', '6'].map((i) => piece(i, 'Motion'));
    expect(galleryRibbons(six).map((r) => [r.name, r.pieces.length])).toEqual([['Motion', 6]]);
  });

  it('drops a ribbon of 2 and keeps ribbons of 3, in first-seen order', () => {
    const pieces = [
      piece('1', 'Posters'),
      piece('2', 'Motion'),
      piece('3', 'Posters'),
      piece('4', 'Social'),
      piece('5', 'Motion'),
      piece('6', 'Posters'),
      piece('7', 'Motion'),
      piece('8', 'Social'),
    ];
    expect(galleryRibbons(pieces).map((r) => [r.name, r.pieces.map((p) => p.id)])).toEqual([
      ['Posters', ['1', '3', '6']],
      ['Motion', ['2', '5', '7']],
    ]);
  });

  it('counts only shown ribbons toward the gallery threshold', () => {
    // 3 + 2 + 2 = 7 pieces, but only one ribbon of 3 survives: under 6, no gallery.
    const pieces = [piece('1', 'A'), piece('2', 'A'), piece('3', 'A'), piece('4', 'B'), piece('5', 'B'), piece('6', 'C'), piece('7', 'C')];
    expect(galleryRibbons(pieces)).toEqual([]);
  });
});
