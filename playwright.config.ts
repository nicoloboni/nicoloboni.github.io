import { defineConfig, devices } from '@playwright/test';

// `prod` runs against the production build (`pnpm build` first), the same output Pages would
// serve. `dev` covers what only exists in development: pending projects and the motion probe.
const PROD = 4329;
const DEV = 4331;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'] },
  projects: [
    { name: 'prod', testIgnore: /\.dev\.spec\.ts$/, use: { baseURL: `http://127.0.0.1:${PROD}` } },
    { name: 'dev', testMatch: /\.dev\.spec\.ts$/, use: { baseURL: `http://127.0.0.1:${DEV}` } },
  ],
  // Astro 7 backgrounds itself when it detects an agent; --ignore-lock keeps it in the
  // foreground so Playwright owns the process.
  webServer: [
    {
      command: `pnpm exec astro preview --port ${PROD} --host 127.0.0.1 --ignore-lock`,
      url: `http://127.0.0.1:${PROD}`,
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      command: `pnpm exec astro dev --port ${DEV} --host 127.0.0.1 --ignore-lock`,
      url: `http://127.0.0.1:${DEV}`,
      reuseExistingServer: false,
      stdout: 'ignore',
    },
  ],
});
