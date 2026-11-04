/**
 * The production build carries no trace of a `pending` entry: no page, no text, no image.
 * Reads dist/ as produced by `pnpm build`: run `pnpm test:clearance`, which builds first.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CLEARANCES } from '../src/lib/visibility-rules';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const COLLECTIONS = ['projects', 'pieces'] as const;
const MEDIA = /[^\s'"()[\]]+\.(?:png|jpe?g|webp|avif|gif|svg|mp4|webm)\b/gi;

interface Pending {
  id: string;
  needles: string[];
  mediaStems: string[];
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const stem = (path: string) => basename(path, extname(path)).toLowerCase();

/** The same text as Astro may write it: HTML-escaped, and with Markdown's typographic quotes. */
function variants(text: string): string[] {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  const curly = text.replace(/'/g, '’').replace(/"/g, '”');
  return [...new Set([text, escape(text), curly, escape(curly)])];
}

function entries(collection: (typeof COLLECTIONS)[number]) {
  const dir = join(ROOT, 'src/content', collection);
  return walk(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const [, fm = '', body = ''] = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [];
      const data = (parse(fm) ?? {}) as Record<string, unknown>;
      const id = typeof data.slug === 'string' ? data.slug : basename(file, '.md');
      return { collection, file, id, data, body, raw };
    });
}

const all = COLLECTIONS.flatMap(entries);

function pendingEntries(): Pending[] {
  return all
    .filter((e) => e.data.clearance === 'pending')
    .map((e) => {
      const strings = [e.data.title, e.data.summary, e.data.coverAlt, (e.data.media as { alt?: string } | undefined)?.alt]
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim());
      // Every prose line of the body, without Markdown markers; a role or tool name is left out
      // because it could legitimately appear on another project.
      const bodyLines = e.body
        .split('\n')
        .map((l) => l.replace(/^\s*(?:#+|[-*>]|\d+\.)\s*/, '').trim())
        .filter((l) => l.length >= 12 && !/^!\[/.test(l));
      const assetDir = join(ROOT, 'src/assets', e.collection, e.id);
      return {
        id: e.id,
        needles: [e.id, ...strings, ...bodyLines].filter((s) => s.length >= 8),
        mediaStems: [...new Set([...[...e.raw.matchAll(MEDIA)].map((m) => stem(m[0])), ...walk(assetDir).map(stem)])],
      };
    });
}

describe('production build and clearance', () => {
  const files = walk(DIST);
  const bytes = files.map((f) => ({ f: f.replace(DIST, 'dist'), b: readFileSync(f) }));
  const pending = pendingEntries();

  it('has a build to inspect, newer than the content and the rules', () => {
    expect(files.length, 'run `pnpm test:clearance` (it builds first)').toBeGreaterThan(0);
    const built = statSync(join(DIST, 'index.html')).mtimeMs;
    const sources = [...walk(join(ROOT, 'src/content')), ...walk(join(ROOT, 'src/assets')), ...walk(join(ROOT, 'src/lib')), join(ROOT, 'src/content.config.ts')];
    const stale = sources.filter((s) => statSync(s).mtimeMs > built).map((s) => s.replace(ROOT, ''));
    expect(stale, 'dist/ is older than these files: rebuild').toEqual([]);
  });

  it('can find text in the build (control: the hero name is there)', () => {
    expect(bytes.some(({ b }) => b.includes(Buffer.from('Nicolò')))).toBe(true);
  });

  it('every entry has a clearance the schema knows', () => {
    for (const e of all) expect(CLEARANCES, `${e.file.replace(ROOT, '')}`).toContain(e.data.clearance);
  });

  // Pending entries are git-ignored, so a fresh clone (the CI) has none and checks only the rules
  // above; on Nicolò's machine every local pending entry is checked below.
  it('lists the pending entries it checks', () => {
    console.log(`pending entries checked: ${pending.length}`);
    expect(pending.every((p) => p.needles.length > 0)).toBe(true);
  });

  for (const p of pending) {
    it(`${p.id}: no text in any built file`, () => {
      expect(p.needles.length, 'too few distinctive strings to check').toBeGreaterThanOrEqual(3);
      for (const needle of p.needles.flatMap(variants)) {
        const hits = bytes.filter(({ b }) => b.includes(Buffer.from(needle))).map(({ f }) => f);
        expect(hits, `"${needle}"`).toEqual([]);
      }
    });

    it(`${p.id}: no page and no image file`, () => {
      expect(p.mediaStems.length).toBeGreaterThan(0);
      const leaked = files
        .map((f) => f.replace(DIST, ''))
        .filter((f) => f.toLowerCase().includes(p.id) || p.mediaStems.some((s) => basename(f).toLowerCase().startsWith(s)));
      expect(leaked).toEqual([]);
    });
  }
});
