import { gsap } from 'gsap';

/**
 * Selected work: the cards are sticky in CSS; while the next card slides over, the one below
 * shrinks to 0.94, following the scroll. Built inside the engine's matchMedia, so it is reverted
 * with it.
 */
export function stackCards(root: ParentNode = document) {
  const cards = [...root.querySelectorAll<HTMLElement>('.work .card')];
  cards.slice(0, -1).forEach((card, i) => {
    gsap.to(card.querySelector('.inner'), {
      scale: 0.94,
      ease: 'none',
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 12%', scrub: true },
    });
  });
}
