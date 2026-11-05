# nicoloboni.github.io

Personal portfolio of Nicolò Boni, developer and designer. Built with Astro, GSAP and Lenis.

Status: the home page is live (hero, about, footer). The gallery shows from 6 publishable pieces,
the case studies and `/work` from one publishable project. Work made for companies appears only
after their written consent.

## Develop

```bash
pnpm install
pnpm dev
```

## Check and test

```bash
pnpm check            # astro check
pnpm test             # Vitest: clearance and gallery rules
pnpm test:clearance   # builds, then checks dist/ has no trace of a pending entry
pnpm test:e2e         # builds, then Playwright on the build and on the dev server
```

Do not build while `astro dev` runs in the same folder: both write `.astro/content-assets.mjs`,
and a dev resync during a build can put pending images into the local dist/.

## Content

- `src/content/projects/`: case studies, one Markdown file each. `clearance` is `personal`,
  `pending` or `granted`; `pending` projects show in development and never reach the production
  build.
- `src/content/pieces/`: single gallery pieces (motion, graphics), no page of their own. They
  carry `clearance` too: a piece made for a brand needs the same consent.
- Images of a project go in `src/assets/projects/<slug>/` and are referenced only from its entry,
  never imported by a component or placed in `public/`.
- Images of a piece go in `src/assets/pieces/<id>/`, through its entry like a project's. A video
  goes in the same folder, named in `media.src` by its bare file name: the dev server serves it from
  there, and a build copies into `dist/media/pieces/` only the videos a built page points to
  (`src/integrations/piece-videos.ts`), so a pending piece's video is never shipped.
- A `pending` entry and its images are listed in `.git/info/exclude`, so they live only on the
  machine that has them and never reach the public repository.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`: `astro check`, the build and the
clearance test on `dist/`, then the deploy to GitHub Pages.

## Licences

Code: all rights reserved for now. Fonts: Bricolage Grotesque and Instrument Serif, SIL Open Font
License 1.1, shipped through Fontsource. GSAP is used under the GSAP Standard "no charge" licence.
