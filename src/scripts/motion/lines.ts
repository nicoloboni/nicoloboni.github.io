import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

/**
 * About: each [data-lines] block is split into masked lines that rise once, one after the other,
 * when it is 80% down the screen. autoSplit re-splits when the fonts land or the width changes;
 * the animation is returned from onSplit so SplitText keeps it in step. aria is left alone: the
 * markup already hides the split copy and gives screen readers the sentence whole.
 */
export function revealLines(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-lines]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      aria: 'none',
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 100,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
        }),
    });
  });
}
