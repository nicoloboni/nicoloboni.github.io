// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nicoloboni.github.io',
  base: '/',
  trailingSlash: 'ignore',
  // Pre-bundled up front, so the dev server never reloads the page to optimise them later.
  vite: { optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger', 'lenis'] } },
});
