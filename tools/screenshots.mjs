/**
 * Boots the built application and captures it at the three supported widths.
 *
 *   npm run build && npm run screenshots
 *
 * Every design review depends on this: horizontal overflow is a property of laid-out content, so a
 * reviewer without a rendered page cannot see it at all. Output lands in screenshots/.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'screenshots');
const port = Number(process.env.EDUCODE_SCREENSHOT_PORT ?? 4318);
const baseUrl = `http://127.0.0.1:${port}`;

const widths = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

/**
 * Pages to capture. Add a route here when a slice adds one.
 *
 * The five lesson pages are here because criteria W2 and W3 in docs/specs/markdown-rendering.md
 * cannot be checked anywhere else: jsdom applies no stylesheet, so horizontal overflow and
 * `white-space` are invisible to the vitest suite. These are real checks, not just captures.
 */
const routes = [
  { name: 'home', path: '/' },
  { name: 'lesson-01', path: '/lessons/LS-M020-01' },
  { name: 'lesson-02', path: '/lessons/LS-M020-02' },
  { name: 'lesson-03', path: '/lessons/LS-M020-03' },
  { name: 'lesson-04', path: '/lessons/LS-M020-04' },
  { name: 'lesson-05', path: '/lessons/LS-M020-05' },
];

const serverEntry = path.join(repoRoot, 'apps', 'server', 'dist', 'index.js');
const webIndex = path.join(repoRoot, 'apps', 'web', 'dist', 'index.html');
for (const [file, what] of [
  [serverEntry, 'server'],
  [webIndex, 'client'],
]) {
  if (!fs.existsSync(file)) {
    console.error(`The ${what} build is missing (${file}). Run: npm run build`);
    process.exit(1);
  }
}

async function waitForHealth(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`The app did not answer at ${baseUrl} within ${timeoutMs}ms`);
}

const child = spawn(process.execPath, [serverEntry], {
  env: {
    ...process.env,
    EDUCODE_PORT: String(port),
    EDUCODE_DATA_DIR: path.join(repoRoot, 'data', 'screenshots'),
  },
  stdio: 'ignore',
});

/** Every check that failed, so one run reports all of them instead of the first. */
const failures = [];

let browser;
try {
  await waitForHealth();
  fs.mkdirSync(outDir, { recursive: true });
  browser = await chromium.launch();

  for (const route of routes) {
    for (const size of widths) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        if (root.scrollWidth <= root.clientWidth) return null;
        // Name the widest element, so a failure points at the block to fix rather than at the page.
        const widest = [...document.querySelectorAll('body *')]
          .map((element) => ({ element, right: element.getBoundingClientRect().right }))
          .sort((a, b) => b.right - a.right)[0];
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          culprit: widest ? `${widest.element.tagName.toLowerCase()}.${widest.element.className}` : 'unknown',
        };
      });
      if (overflow) {
        failures.push(
          `${route.name} scrolls sideways at ${size.width}px: ${overflow.scrollWidth}px of content ` +
            `in a ${overflow.clientWidth}px page, widest element ${overflow.culprit}`,
        );
      }

      // Whitespace inside a code block is load-bearing in HTTP samples, and only a real stylesheet
      // can break it. jsdom cannot see this at all.
      const wrapping = await page.evaluate(() =>
        [...document.querySelectorAll('pre')]
          .map((block) => getComputedStyle(block).whiteSpace)
          .filter((value) => value !== 'pre'),
      );
      if (wrapping.length > 0) {
        failures.push(
          `${route.name} at ${size.width}px has ${wrapping.length} code block(s) not set to ` +
            `white-space: pre (found ${[...new Set(wrapping)].join(', ')})`,
        );
      }

      const file = path.join(outDir, `${route.name}-${size.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  ${path.relative(repoRoot, file)}`);
      await context.close();
    }
  }
} finally {
  await browser?.close();
  child.kill();
}

if (failures.length > 0) {
  console.error(`
${failures.length} layout check(s) failed:`);
  for (const failure of failures) console.error(`  ! ${failure}`);
  process.exit(1);
}
console.log(`
Layout checks passed on ${routes.length} routes at ${widths.length} widths.`);
