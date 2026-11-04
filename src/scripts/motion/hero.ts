import { gsap } from 'gsap';

/** The two name lines rise from their masks, one after the other. */
export function heroIntro(root: ParentNode = document): gsap.core.Timeline | null {
  const lines = root.querySelectorAll<HTMLElement>('.hero .line');
  // The inline fallback already revealed the lines: replaying would hide them again.
  if (lines.length === 0 || document.documentElement.dataset.intro === 'fallback') return null;
  document.documentElement.dataset.intro = 'run';
  return gsap.timeline().fromTo(
    lines,
    { yPercent: 110 },
    { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12, clearProps: 'transform' },
  );
}
