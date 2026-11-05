// @ts-check
import { defineConfig } from 'astro/config';
import pieceVideos from './src/integrations/piece-videos';

export default defineConfig({
  site: 'https://nicoloboni.github.io',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [pieceVideos()],
  // Gives the images in a case study's Markdown body a srcset: without it they ship at the size of
  // the capture (2880 px) to every screen.
  image: { layout: 'constrained' },
  // Pre-bundled up front, so the dev server never reloads the page to optimise them later.
  vite: { optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'lenis'] } },
});
