import type { CollectionEntry } from 'astro:content';

type Category = CollectionEntry<'projects'>['data']['category'];

/** The kind of work as a card caption says it, singular. */
export const KIND: Record<Category, string> = {
  web: 'Website',
  motion: 'Motion',
  graphics: 'Graphics',
  product: 'Product UI',
};

/** Index sections, in the order /work lists them. */
export const CATEGORY_TITLES: [Category, string][] = [
  ['web', 'Websites'],
  ['product', 'Product interfaces'],
  ['motion', 'Motion'],
  ['graphics', 'Graphics'],
];
