import { defineConfig, devices } from '@playwright/test';

// Settings for Playwright Test. The lesson explains the parts you need today.
export default defineConfig({
  // Where the test files are.
  testDir: './tests',

  // Run one test at a time. The site keeps its bookings in memory, so two tests booking at the
  // same moment could get in each other's way. Running tests side by side is taught later.
  workers: 1,

  // Print one line per test in the terminal.
  reporter: 'list',

  // Use Playwright's own build of Chromium.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Before the tests, start the good build of the practice site and wait until something answers at
  // that port. If a site is already answering there, use that one instead of starting another.
  webServer: {
    command: 'node site/server.mjs',
    port: 4420,
    reuseExistingServer: true,
  },
});
