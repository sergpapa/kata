import { defineConfig } from '@playwright/test';
import normal from './playwright.config';

// The same settings as playwright.config.ts, with two changes so that a person can follow a run:
// the browser window is shown, and Playwright pauses for 0.8 seconds after each action.
// A normal run has neither. Use this with:   npm run watch
export default defineConfig({
  ...normal,
  use: {
    headless: false,
    launchOptions: { slowMo: 800 },
  },
});
