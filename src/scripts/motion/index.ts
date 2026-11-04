import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createSmoothScroll, type SmoothScroll } from './lenis';
import { stackCards } from './stack';

gsap.registerPlugin(ScrollTrigger);

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
      expose();
      return () => {
        smooth?.destroy();
        smooth = null;
        liveLenis--;
        expose();
      };
    },
  );
  expose();
}

export function destroyMotion() {
  if (!mm) return;
  mm.revert();
  mm = null;
  active--;
  expose();
}
