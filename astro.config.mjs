// @ts-check
import { defineConfig } from 'astro/config';
import pieceVideos from './src/integrations/piece-videos';

export default defineConfig({
  site: 'https://nicoloboni.github.io',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [pieceVideos()],
  // Pre-bundled up front, so the dev server never reloads the page to optimise them later.
  vite: { optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'lenis'] } },
});
