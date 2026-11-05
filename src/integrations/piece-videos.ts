import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { VIDEO_ROUTE, referencedVideos } from '../lib/piece-video';

/** Copies into the build only the piece videos that a built page references (see piece-video.ts). */
export default function pieceVideos(): AstroIntegration {
  let root = '';
  return {
    name: 'piece-videos',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const pages = (await readdir(out, { recursive: true })).filter((f) => f.endsWith('.html'));
        const wanted = new Map<string, { id: string; file: string }>();
        for (const page of pages) {
          for (const v of referencedVideos(await readFile(join(out, page), 'utf8'))) wanted.set(`${v.id}/${v.file}`, v);
        }
        for (const { id, file } of wanted.values()) {
          const from = join(root, 'src/assets/pieces', id, file);
          if (!existsSync(from)) throw new Error(`piece-videos: a page points to ${id}/${file}, which is not in src/assets/pieces/${id}/`);
          const to = join(out, VIDEO_ROUTE, id, file);
          await mkdir(dirname(to), { recursive: true });
          await copyFile(from, to);
        }
        logger.info(`${wanted.size} piece video(s) copied`);
      },
    },
  };
}
