/**
 * What the site may show, as pure functions: tested on their own and shared by the content
 * config (which must not import astro:content) and visibility.ts.
 */

export const CLEARANCES = ['personal', 'pending', 'granted'] as const;
export type Clearance = (typeof CLEARANCES)[number];

/** Minimum number of pieces before a part of the gallery is shown at all. */
export const THRESHOLDS = { gallery: 6, ribbon: 3 } as const;

/**
 * Fail closed: anything that is not the dev server counts as production. PROD alone follows
 * NODE_ENV, so `NODE_ENV=development astro build` or `--devOutput` would flip it; pending
 * content needs both the dev flag and the `development` mode, which only `astro dev` sets.
 */
export const isProductionBuild = (): boolean => !(import.meta.env.DEV && import.meta.env.MODE === 'development');

/** A `pending` project has no written consent yet: it may exist in development only. */
export function isPublishable(clearance: Clearance, production: boolean): boolean {
  return !production || clearance !== 'pending';
}

interface WithClearance {
  data: { clearance: Clearance };
}

interface Ordered {
  data: { order: number };
}

export function filterPublishable<T extends WithClearance>(entries: T[], production: boolean): T[] {
  return entries.filter((e) => isPublishable(e.data.clearance, production));
}

export function byOrder<T extends Ordered>(a: T, b: T): number {
  return a.data.order - b.data.order;
}

interface Piece {
  data: { ribbon: string };
}

export interface RibbonGroup<T> {
  name: string;
  pieces: T[];
}

/**
 * Ribbons of the gallery in first-seen order. A ribbon under the threshold is dropped, and if
 * what is left is under the gallery threshold there is no gallery: never an empty-looking section.
 */
export function galleryRibbons<T extends Piece>(pieces: T[]): RibbonGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const p of pieces) groups.set(p.data.ribbon, [...(groups.get(p.data.ribbon) ?? []), p]);
  const ribbons = [...groups].filter(([, list]) => list.length >= THRESHOLDS.ribbon).map(([name, list]) => ({ name, pieces: list }));
  const total = ribbons.reduce((n, r) => n + r.pieces.length, 0);
  return total >= THRESHOLDS.gallery ? ribbons : [];
}
