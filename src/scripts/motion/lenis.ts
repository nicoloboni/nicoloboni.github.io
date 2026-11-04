import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export interface SmoothScroll {
  lenis: Lenis;
  destroy(): void;
}

/** Lenis driven by GSAP's ticker, so smooth scroll and ScrollTrigger share one frame loop. */
export function createSmoothScroll(): SmoothScroll {
  const lenis = new Lenis({ autoRaf: false });
  const tick = (time: number) => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return {
    lenis,
    destroy() {
      gsap.ticker.remove(tick);
      lenis.destroy();
    },
  };
}
