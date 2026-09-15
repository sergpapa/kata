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
import { checkDiagram, checkMermaidIsLazy } from './diagram-checks.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'screenshots');
const port = Number(process.env.EDUCODE_SCREENSHOT_PORT ?? 4318);
const baseUrl = `http://127.0.0.1:${port}`;

const widths = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

/** Both schemes are captured: the palette is token-based and a reviewer cannot check dark without
 *  a dark capture. The layout checks below run in both, since only light was ever exercised. */
const schemes = ['light', 'dark'];

/**
 * Pages to capture. Add a route here when a slice adds one.
 *
 * The five lesson pages are here because criteria W2 and W3 in docs/specs/markdown-rendering.md
 * cannot be checked anywhere else: jsdom applies no stylesheet, so horizontal overflow and
 * `white-space` are invisible to the vitest suite. These are real checks, not just captures.
 */
const routes = [
  { name: 'home', path: '/' },
  { name: 'practice', path: '/practice' },
  { name: 'reviews', path: '/reviews' },
  { name: 'progress', path: '/progress' },
  { name: 'lesson-01', path: '/lessons/LS-M020-01', diagram: 'drawn' },
  { name: 'lesson-02', path: '/lessons/LS-M020-02', diagram: 'fallback' },
  { name: 'lesson-03', path: '/lessons/LS-M020-03', diagram: 'none' },
  { name: 'lesson-04', path: '/lessons/LS-M020-04', diagram: 'none' },
  { name: 'lesson-05', path: '/lessons/LS-M020-05', diagram: 'drawn' },
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

/** Every check that failed, so one run reports all of them instead of the first. */
const failures = [];

/**
 * Whether the page scrolls sideways, and what is widest if it does. Naming the culprit points a
 * failure at the block to fix rather than at the page.
 */
async function sidewaysScroll(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    if (root.scrollWidth <= root.clientWidth) return null;
    const widest = [...document.querySelectorAll('body *')]
      .map((element) => ({ element, right: element.getBoundingClientRect().right }))
      .sort((a, b) => b.right - a.right)[0];
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      culprit: widest
        ? `${widest.element.tagName.toLowerCase()}.${widest.element.className}`
        : 'unknown',
    };
  });
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

checkMermaidIsLazy(repoRoot, webIndex, failures);

const child = spawn(process.execPath, [serverEntry], {
  env: {
    ...process.env,
    EDUCODE_PORT: String(port),
    EDUCODE_DATA_DIR: path.join(repoRoot, 'data', 'screenshots'),
  },
  stdio: 'ignore',
});

let browser;
try {
  await waitForHealth();
  // Wiped, not merged: a capture from a route that no longer exists is worse than no capture, and
  // a reviewer has no way to tell a stale file from a current one.
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  browser = await chromium.launch();

  for (const route of routes) {
    for (const size of widths) {
      for (const scheme of schemes) {
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          colorScheme: scheme,
        });
        const page = await context.newPage();
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });

        const drewDiagram = await checkDiagram(page, route, size, scheme, failures);

        const overflow = await sidewaysScroll(page);
        if (overflow) {
          failures.push(
            `${route.name} (${scheme}) scrolls sideways at ${size.width}px: ${overflow.scrollWidth}px of content ` +
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
            `${route.name} (${scheme}) at ${size.width}px has ${wrapping.length} code block(s) not set to ` +
              `white-space: pre (found ${[...new Set(wrapping)].join(', ')})`,
          );
        }

        const file = path.join(outDir, `${route.name}-${size.name}-${scheme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`  ${path.relative(repoRoot, file)}`);

        // The drawing on its own, as well as inside the page. A blank frame is invisible in a
        // 12,000px full-page PNG — the review that found this one had to crop it out to see it.
        //
        // Gated on a drawing having been found rather than on the route asking for one: a lesson
        // that lost its diagram is already reported above, and a locator that waits 30s for an
        // element which is never coming would throw away every other failure in the run.
        if (drewDiagram) {
          const diagramFile = path.join(outDir, `${route.name}-${size.name}-${scheme}-diagram.png`);
          await page.locator('.diagram-scroll').first().screenshot({ path: diagramFile });
          console.log(`  ${path.relative(repoRoot, diagramFile)}`);
        }
        await context.close();
      }
    }
  }

  /**
   * Criterion R5 in docs/specs/visual-design-integration.md. Browser zoom does not magnify pixels,
   * it shrinks the CSS pixel: a 1440px window at 200% lays out as 720 CSS pixels. So the honest
   * check is a 720-wide viewport, not a `zoom` property, and it is run where the criterion points —
   * the dashboard's primary action and a lesson's prose.
   */
  for (const route of [
    { name: 'home', path: '/', mustSee: 'a[href="/lessons/LS-M020-01"]' },
    { name: 'lesson-01', path: '/lessons/LS-M020-01', mustSee: '.lesson-body p' },
  ]) {
    const context = await browser.newContext({ viewport: { width: 720, height: 450 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });

    const overflow = await sidewaysScroll(page);
    if (overflow) {
      failures.push(
        `${route.name} scrolls sideways at 720px — 1440px at 200% zoom: ${overflow.scrollWidth}px ` +
          `of content in a ${overflow.clientWidth}px page, widest element ${overflow.culprit}`,
      );
    }

    // On screen, not merely in the document: a control pushed outside the viewport is unreachable
    // to the reader who zoomed in order to see it.
    const visible = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return 'missing';
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= document.documentElement.clientWidth
        ? 'ok'
        : 'off-screen';
    }, route.mustSee);
    if (visible !== 'ok') {
      failures.push(`${route.name} at 720px: ${route.mustSee} is ${visible}`);
    }

    await page.screenshot({
      path: path.join(outDir, `${route.name}-zoom-720.png`),
      fullPage: true,
    });
    await context.close();
  }

  /**
   * Criterion R6. The drawer is the one piece of this layout that has a second state, and a
   * sidebar that overflows the page only once opened would pass every check above.
   */
  for (const scheme of schemes) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      colorScheme: scheme,
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /navigation/i }).click();
    // Settled, not merely present. The drawer slides in over 0.2s, and both the measurement and
    // the capture below would otherwise read a position it is only passing through — which is how
    // the first version of this check photographed an empty scrim and called it a pass.
    await page.waitForFunction(() => {
      const nav = document.querySelector('nav.sidebar');
      return nav !== null && getComputedStyle(nav).transform === 'none';
    });

    const overflow = await sidewaysScroll(page);
    if (overflow) {
      failures.push(
        `the open drawer (${scheme}) scrolls the page sideways at 375px: ${overflow.scrollWidth}px ` +
          `of content in a ${overflow.clientWidth}px page, widest element ${overflow.culprit}`,
      );
    }

    const reachable = await page.evaluate(() => {
      // By class, not by id: the sidebar's id comes from React's useId and is not a name this
      // script can know. Querying `#sidebar` matched nothing and passed every time.
      const links = [...document.querySelectorAll('nav.sidebar a')];
      if (links.length === 0) return ['no destinations found in the drawer at all'];
      const width = document.documentElement.clientWidth;
      return links
        .filter((link) => {
          const box = link.getBoundingClientRect();
          return box.right > width || box.left < 0 || box.width === 0;
        })
        .map((link) => link.textContent?.trim());
    });
    if (reachable.length > 0) {
      failures.push(
        `the open drawer (${scheme}) at 375px puts ${reachable.length} destination(s) out of ` +
          `reach: ${reachable.join(', ')}`,
      );
    }

    // The jsdom suite proves the open drawer takes focus, but jsdom applies no stylesheet — and
    // the closed drawer is hidden with `visibility: hidden`, which in a real browser refuses focus
    // outright. Only here can the two facts be checked against each other.
    const focused = await page.evaluate(() =>
      document.querySelector('nav.sidebar')?.contains(document.activeElement) === true
        ? 'inside'
        : (document.activeElement?.className ?? document.activeElement?.tagName ?? 'nothing'),
    );
    if (focused !== 'inside') {
      failures.push(
        `the open drawer (${scheme}) at 375px did not take focus — it is on ${focused}, so the ` +
          `next Tab is behind the scrim`,
      );
    }

    await page.screenshot({ path: path.join(outDir, `drawer-mobile-375-${scheme}.png`) });
    await context.close();
  }

  /**
   * Criterion R7. Navigation stays where the reader left it.
   *
   * A lesson is 12,000px tall at 1440px and 24,000px at 375px. A sidebar that scrolls away with
   * the page is reachable only by scrolling back to the top of a lesson the reader is in the
   * middle of — and on a phone the control that opens the drawer goes with it, which leaves no
   * way to reach navigation at all. Checked 3,000px down a real lesson, because at the top of the
   * page a sidebar that scrolls and one that does not look exactly alike.
   */
  for (const pinned of [
    { width: 1440, height: 900, selectors: ['nav.sidebar a', '.topbar'] },
    { width: 375, height: 812, selectors: ['.sidebar-trigger'] },
  ]) {
    const context = await browser.newContext({
      viewport: { width: pinned.width, height: pinned.height },
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/lessons/LS-M020-01`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForFunction(() => window.scrollY > 2500);

    for (const selector of pinned.selectors) {
      const state = await page.evaluate((query) => {
        const element = document.querySelector(query);
        if (!element) return 'not on the page';
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return 'collapsed to nothing';
        return box.top >= 0 && box.bottom <= window.innerHeight
          ? 'on screen'
          : `off screen — its top is at ${Math.round(box.top)}px`;
      }, selector);
      if (state !== 'on screen') {
        failures.push(
          `at ${pinned.width}px, 3000px down a lesson, ${selector} is ${state}: navigation must ` +
            `stay in view rather than scrolling away with the page`,
        );
      }
    }

    await page.screenshot({
      path: path.join(outDir, `pinned-nav-${pinned.width}.png`),
    });
    await context.close();
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
const drawn = routes.filter((route) => route.diagram === 'drawn').length;
console.log(`
Layout checks passed on ${routes.length} routes x ${widths.length} widths x ${schemes.length} schemes, plus 720px (1440 at 200% zoom), the open drawer at 375px, and navigation still in view 3000px down a lesson.
${drawn} diagram(s) were opened and read inside their frames at every width and scheme.`);
