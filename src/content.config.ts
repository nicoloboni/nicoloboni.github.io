import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { CLEARANCES, isProductionBuild, isPublishable, type Clearance } from './lib/visibility-rules';

/**
 * In production a `pending` entry never reaches the data store, so no page, query or image
 * import can pick it up by accident: content images are emitted for every entry in the store,
 * shown or not (measured 2026-11-04). visibleProjects()/visiblePieces() filter again on top.
 *
 * Images of a project live in src/assets/projects/<slug>/ and are referenced only from its
 * entry (schema or Markdown body), never imported by a component or put in public/: anything
 * outside the content layer skips this guard.
 */
function withClearance(name: string, base: string): Loader {
  const inner = glob({ base, pattern: '**/*.md' });
  return {
    name,
    async load(context) {
      await inner.load(context);
      const production = isProductionBuild();
      for (const [id, entry] of context.store.entries()) {
        if (!isPublishable(entry.data.clearance as Clearance, production)) context.store.delete(id);
      }
    },
  };
}

const projects = defineCollection({
  loader: withClearance('projects-with-clearance', './src/content/projects'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int().min(2000).max(2100),
      role: z.string(),
      tools: z.array(z.string()).min(1),
      category: z.enum(['web', 'motion', 'graphics', 'product']),
      cover: image(),
      coverAlt: z.string().min(1),
      summary: z.string(),
      link: z.url().optional(),
      order: z.number().int(),
      featured: z.boolean().default(false),
      clearance: z.enum(CLEARANCES),
    }),
});

const pieces = defineCollection({
  loader: withClearance('pieces-with-clearance', './src/content/pieces'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int().min(2000).max(2100),
      category: z.enum(['motion', 'graphics']),
      media: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('image'), src: image(), alt: z.string().min(1) }),
        z.object({ kind: z.literal('video'), src: z.string().regex(/\.(mp4|webm)$/), poster: image(), alt: z.string().min(1) }),
      ]),
      ribbon: z.string(),
      // Pieces made for a brand (social, ads) need the same written consent as projects.
      clearance: z.enum(CLEARANCES),
    }),
});

export const collections = { projects, pieces };
