import { gsap } from 'gsap';

/** Largest sideways shift, as a share of the ribbon's length (spec: at most 30%). */
const MAX_SHIFT = 0.3;

/**
 * Gallery on desktop: each ribbon slides sideways while it crosses the screen, following the
 * scroll, alternate ribbons the other way. The shift is what the track overflows the page by,
 * capped at 30% of its length.
 */
export function slideRibbons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.gallery .ribbon').forEach((ribbon) => {
    const track = ribbon.querySelector<HTMLElement>('.track')!;
    const dir = Number(ribbon.dataset.dir);
    const shift = () => Math.max(0, Math.min(track.scrollWidth - document.documentElement.clientWidth, track.scrollWidth * MAX_SHIFT));
    gsap.fromTo(
      track,
      { x: () => (dir > 0 ? 0 : -shift()) },
      {
        x: () => (dir > 0 ? -shift() : 0),
        ease: 'none',
        scrollTrigger: { trigger: ribbon, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      },
    );
  });
}

/** Gallery videos play only while on screen. Returns the cleanup, which leaves them paused. */
export function playVideosInView(root: ParentNode = document): () => void {
  const videos = [...root.querySelectorAll<HTMLVideoElement>('.gallery video')];
  if (videos.length === 0) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }
    },
    { threshold: 0.25 },
  );
  videos.forEach((v) => io.observe(v));
  return () => {
    io.disconnect();
    videos.forEach((v) => v.pause());
  };
}
