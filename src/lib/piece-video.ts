import { isProductionBuild } from './visibility-rules';

/**
 * Videos of gallery pieces bypass the content layer's image pipeline, so they get their own
 * route: a video lives in src/assets/pieces/<id>/ next to its poster, the dev server serves it
 * from there, and a build copies into dist/ only the videos a built page points to (the
 * piece-videos integration). A pending piece is never rendered in production, so its video is
 * never referenced and never copied. Never put a video in public/: that folder is copied whole.
 */
export const VIDEO_ROUTE = '/media/pieces';

/** A video reference as a built page writes it: /media/pieces/<id>/<file>. */
export const VIDEO_REF = /\/media\/pieces\/([\w-]+)\/([\w-]+\.(?:mp4|webm))/g;

export function pieceVideoUrl(id: string, file: string): string {
  return isProductionBuild() ? `${VIDEO_ROUTE}/${id}/${file}` : `/src/assets/pieces/${id}/${file}`;
}

/** Every distinct piece video a page's HTML points to. */
export function referencedVideos(html: string): { id: string; file: string }[] {
  const seen = new Map<string, { id: string; file: string }>();
  for (const [, id, file] of html.matchAll(VIDEO_REF)) seen.set(`${id}/${file}`, { id, file });
  return [...seen.values()];
}
