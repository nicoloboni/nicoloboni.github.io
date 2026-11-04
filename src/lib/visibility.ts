import { getCollection, type CollectionEntry } from 'astro:content';
import { byOrder, filterPublishable, galleryRibbons, isProductionBuild, type RibbonGroup } from './visibility-rules';

export * from './visibility-rules';

/** Projects the current build may show, in their set order. */
export async function visibleProjects(): Promise<CollectionEntry<'projects'>[]> {
  const all = await getCollection('projects');
  return filterPublishable(all, isProductionBuild()).sort(byOrder);
}

/** Gallery ribbons the current build may show: a piece made for a brand needs clearance too. */
export async function visiblePieces(): Promise<RibbonGroup<CollectionEntry<'pieces'>>[]> {
  const all = await getCollection('pieces');
  return galleryRibbons(filterPublishable(all, isProductionBuild()));
}
