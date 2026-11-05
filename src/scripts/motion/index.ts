import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { riseFooter } from './footer';
import { createSmoothScroll, type SmoothScroll } from './lenis';
import { revealLines } from './lines';
import { playVideosInView, slideRibbons } from './ribbons';
import { stackCards } from './stack';

gsap.registerPlugin(ScrollTrigger, SplitText);

let mm: gsap.MatchMedia | null = null;
let smooth: SmoothScroll | null = null;
let active = 0;
let inits = 0;
let liveLenis = 0;

declare global {
  interface Window {
    __motion?: { active: number; inits: number; lenis: number; triggers: number };
  }
}

function expose() {
  if (import.meta.env.DEV) window.__motion = { active, inits, lenis: liveLenis, triggers: ScrollTrigger.getAll().length };
}

/** One motion cycle per page: smooth scroll and every animation live inside one matchMedia. */
export function initMotion() {
  if (mm) return;
  mm = gsap.matchMedia();
  active++;
  inits++;
  mm.add(
    { reduce: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' },
    (ctx) => {
      // Reduced motion: everything is already in its final place, so there is nothing to build.
      if (ctx.conditions?.reduce) return;
      smooth = createSmoothScroll();
      liveLenis++;
      stackCards();
      revealLines();
      riseFooter();
      const stopVideos = playVideosInView();
      expose();
      return () => {
        stopVideos();
        smooth?.destroy();
        smooth = null;
        liveLenis--;
        expose();
      };
    },
  );
  // The ribbons slide only on desktop; on a phone they are columns that scroll on their own.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
    slideRibbons();
    expose();
  });
  expose();
}

export function destroyMotion() {
  if (!mm) return;
  mm.revert();
  mm = null;
  active--;
  expose();
}
