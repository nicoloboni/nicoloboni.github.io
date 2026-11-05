import { gsap } from 'gsap';

/**
 * Footer: while it comes into view the big name rises from below and the aurora climbs and
 * lights up, both following the scroll and both in place once the page bottom is reached.
 */
export function riseFooter(root: ParentNode = document) {
  const footer = root.querySelector<HTMLElement>('.footer');
  if (!footer) return;
  gsap
    .timeline({ scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: true } })
    .from(footer.querySelector('.bigname .fit'), { yPercent: 40, ease: 'none' }, 0)
    .from(footer.querySelector('.aurora'), { yPercent: 30, opacity: 0, ease: 'none' }, 0);
}
