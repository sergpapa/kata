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
 * Criterion M5 in docs/specs/mermaid-diagrams.md: a lesson with no diagram must not pay for
 * Mermaid. No test in jsdom can prove this — `vi.mock('mermaid')` intercepts the module whether
 * the import is lazy or eager — so the built bundle is the only place the claim can be checked.
 * Mermaid must live in a chunk of its own that the entry does not pull in.
 */
function checkMermaidIsLazy() {
  const assetsDir = path.join(repoRoot, 'apps', 'web', 'dist', 'assets');
  const html = fs.readFileSync(webIndex, 'utf8');
  const entryName = /<script[^>]+src="[^"]*\/assets\/([^"]+\.js)"/.exec(html)?.[1];
  if (!entryName) {
    failures.push('could not find the entry script in apps/web/dist/index.html');
    return;
  }

  // A string from Mermaid's own grammar, which none of this application's source contains.
  const marker = 'sequenceDiagram';
  const carrying = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .filter((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8').includes(marker));

  if (carrying.includes(entryName)) {
    failures.push(
      `Mermaid is bundled into the entry chunk (${entryName}), so lessons 3 and 4 pay for a ` +
        `diagram library they do not use. It must be reached by a dynamic import().`,
    );
  } else if (carrying.length === 0) {
    failures.push(`no built chunk contains Mermaid — the diagram code did not reach the bundle`);
  } else {
    console.log(`  Mermaid is lazy: ${carrying.join(', ')}, not the entry ${entryName}`);
  }
}

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

checkMermaidIsLazy();

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

        // Criteria R1, R2 and L4 in docs/specs/mermaid-diagrams.md. jsdom has no SVG layout, so a
        // real browser is the only place that can answer whether a diagram actually became a
        // picture — or whether the one Mermaid refuses fell back to its source with a reason.
        if (route.diagram) {
          // Only where a diagram is expected. A lesson with none would otherwise spend the whole
          // timeout waiting for a selector that can never match — 12 route/width/scheme
          // combinations, three minutes of nothing, on every run.
          if (route.diagram !== 'none') {
            await page
              .waitForSelector('.diagram iframe, .diagram .diagram-reason', { timeout: 15_000 })
              .catch(() => {});
          }
          const diagram = await page.evaluate(() => {
            const frames = [...document.querySelectorAll('.diagram-scroll iframe')];
            const notice = document.querySelector('.diagram [role="status"]');
            const source = [...document.querySelectorAll('.diagram pre')].some((block) =>
              (block.textContent ?? '').includes('sequenceDiagram'),
            );
            return {
              frames: frames.length,
              sandbox: frames.map((frame) => frame.getAttribute('sandbox')),
              sizes: frames.map((frame) => {
                const box = frame.getBoundingClientRect();
                return { w: Math.round(box.width), h: Math.round(box.height) };
              }),
              notice: notice?.textContent ?? null,
              source,
            };
          });

          if (route.diagram === 'drawn') {
            if (diagram.frames !== 1) {
              failures.push(
                `${route.name} (${scheme}) at ${size.width}px drew ${diagram.frames} diagram(s), expected 1` +
                  (diagram.notice ? ` — the page says: ${diagram.notice.trim()}` : ''),
              );
            }
            if (diagram.sandbox.some((value) => value !== '')) {
              failures.push(
                `${route.name} (${scheme}) at ${size.width}px has a diagram frame whose sandbox is ` +
                  `${JSON.stringify(diagram.sandbox)}, expected "" (no allowance at all)`,
              );
            }
            for (const box of diagram.sizes) {
              if (box.w < 100 || box.h < 100) {
                failures.push(
                  `${route.name} (${scheme}) at ${size.width}px has a diagram frame of ${box.w}x${box.h}px, ` +
                    `which is too small to be the drawing`,
                );
              }
            }
          } else if (route.diagram === 'none') {
            // Criterion R3: these two lessons have no diagram at all, and this slice must not have
            // grown them one. An unchecked route cannot report a regression.
            if (diagram.frames !== 0 || diagram.notice !== null) {
              failures.push(
                `${route.name} (${scheme}) at ${size.width}px has diagram machinery on a lesson that has no ` +
                  `diagram: ${diagram.frames} frame(s), notice ${JSON.stringify(diagram.notice)}`,
              );
            }
          } else {
            if (diagram.frames !== 0) {
              failures.push(
                `${route.name} (${scheme}) at ${size.width}px drew ${diagram.frames} diagram(s); this lesson's ` +
                  `diagram does not parse and must fall back to its source`,
              );
            }
            if (!/could not be drawn/i.test(diagram.notice ?? '')) {
              failures.push(
                `${route.name} (${scheme}) at ${size.width}px does not say the diagram could not be drawn ` +
                  `(found ${JSON.stringify(diagram.notice)})`,
              );
            }
            if (!diagram.source) {
              failures.push(
                `${route.name} (${scheme}) at ${size.width}px lost the diagram source it was supposed to fall back to`,
              );
            }
          }
        }

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
    await page.getByRole('navigation', { name: /sections/i }).waitFor({ state: 'visible' });

    const overflow = await sidewaysScroll(page);
    if (overflow) {
      failures.push(
        `the open drawer (${scheme}) scrolls the page sideways at 375px: ${overflow.scrollWidth}px ` +
          `of content in a ${overflow.clientWidth}px page, widest element ${overflow.culprit}`,
      );
    }

    const reachable = await page.evaluate(() => {
      const links = [...document.querySelectorAll('#sidebar a')];
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

    await page.screenshot({ path: path.join(outDir, `drawer-mobile-375-${scheme}.png`) });
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
console.log(`
Layout checks passed on ${routes.length} routes x ${widths.length} widths x ${schemes.length} schemes, plus 720px (1440 at 200% zoom) and the open drawer at 375px.`);
