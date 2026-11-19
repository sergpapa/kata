/**
 * The accessibility gates of docs/specs/accessibility-pass.md (AX1–AX4a), run by screenshots.mjs in
 * real Chromium. jsdom has no layout, colour, focus rendering or accessibility tree, so none of these
 * can live in the vitest suite.
 *
 * Each function returns a list of failure sentences (empty when the check passes), so the caller
 * can report every failure of a run rather than the first.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** WCAG 2.0, 2.1 and 2.2 at A and AA, plus axe's best practice (ADR 0022). Nothing is disabled. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** AX1: every axe-core violation on the page, one sentence each, naming the first offender. */
export async function checkAxe(page) {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async (tags) => {
    // eslint-disable-next-line no-undef -- injected by addScriptTag above
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.map((one) => ({
      id: one.id,
      impact: one.impact,
      count: one.nodes.length,
      first: one.nodes[0]?.target.join(' ') ?? '',
      help: one.help,
    }));
  }, AXE_TAGS);
  return violations.map(
    (one) =>
      `axe ${one.id} [${one.impact}] on ${one.count} element(s), first ${one.first}: ${one.help}`,
  );
}

/**
 * AX2: every standalone control at least 44px each way. Exempt: a link inline in a sentence, and a
 * checkbox or radio whose own label is at least 44px each way. Elements with no box (inside a
 * closed disclosure, or a closed drawer) or parked off the page until focused (the skip link) are
 * not targets yet.
 */
export async function checkTargets(page) {
  const small = await page.evaluate(() => {
    const selector =
      'a[href], button, select, input:not([type="hidden"]), textarea, summary, [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll(selector)]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return false;
        if (box.right + window.scrollX <= 0 || box.bottom + window.scrollY <= 0) return false;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden') return false;
        if (element.tagName === 'A' && style.display === 'inline' && element.closest('p, li, td')) {
          return false;
        }
        if (element.matches('input[type="checkbox"], input[type="radio"]')) {
          const label =
            element.closest('label') ??
            (element.id ? document.querySelector(`label[for="${element.id}"]`) : null);
          const labelBox = label?.getBoundingClientRect();
          if (labelBox && labelBox.height >= 44 && labelBox.width >= 44) return false;
        }
        return box.width < 44 || box.height < 44;
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        const name = (element.getAttribute('aria-label') ?? element.textContent ?? '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 40);
        const kind = `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(' ')[0]}` : ''}`;
        return `${kind} "${name}" is ${Math.round(box.width)}x${Math.round(box.height)}px`;
      });
  });
  return small.map((one) => `target under 44px: ${one}`);
}

/**
 * AX3: list the page's visible focusable elements first, then press Tab from the top. Every listed
 * element must be focused, exactly in document order, and the walk must have at least one stop. At
 * each stop the element must have a box and a focus style that differs from its resting style and
 * is not nothing — a permanent shadow under `outline: none` is not a focus indicator.
 *
 * `mustContain` is a list of [label, selector, count]: the page must offer at least that many
 * listed elements matching the selector. It proves the walk covered the controls the spec names,
 * and a renamed class fails loudly rather than shrinking the check.
 */
export async function tabWalk(page, mustContain) {
  const failures = [];
  const listed = await page.evaluate((wanted) => {
    const selector =
      'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    const ring = (element) => {
      const style = getComputedStyle(element);
      return `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`;
    };
    const visible = [...document.querySelectorAll(selector)].filter((element) => {
      if (element.closest('[inert], [hidden]')) return false;
      // Inside a closed disclosure, only its summary can take focus. Chromium still gives the
      // hidden content a box, so the box test below cannot tell; the open state can.
      const closed = element.closest('details:not([open])');
      if (closed && element.closest('summary')?.parentElement !== closed) return false;
      const box = element.getBoundingClientRect();
      if (getComputedStyle(element).visibility === 'hidden') return false;
      // A radio group is one Tab stop: the checked radio, or the first when none is checked.
      // Arrow keys move within the group, so listing every radio would fail a correct group.
      if (element.matches('input[type="radio"]') && element.name) {
        const group = [
          ...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`),
        ];
        const stop = group.find((one) => one.checked) ?? group[0];
        if (element !== stop) return false;
      }
      // The skip link is parked off the page until focused, but it is in the order: keep it.
      return box.width > 0 || box.height > 0 || element.matches('.skip-link');
    });
    visible.forEach((element, index) => {
      element.dataset.walkIndex = String(index);
      element.dataset.walkRest = ring(element);
    });
    const counts = wanted.map(([label, css, count]) => [
      label,
      visible.filter((element) => element.matches(css)).length,
      count,
    ]);
    return { total: visible.length, counts };
  }, mustContain);

  for (const [label, found, count] of listed.counts) {
    if (found < count) failures.push(`the page offers ${found} of the ${count} ${label} expected`);
  }
  if (listed.total === 0) failures.push('the page has no focusable element at all');

  const order = [];
  for (let press = 0; press < listed.total + 20; press += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return { end: true };
      if (element.dataset.walked) return { end: true };
      element.dataset.walked = 'yes';
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const focused = `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`;
      const shows =
        (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== 'none';
      return {
        end: false,
        index: element.dataset.walkIndex === undefined ? -1 : Number(element.dataset.walkIndex),
        name: `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`,
        indicator: shows && focused !== element.dataset.walkRest,
        sized: box.width > 0 && box.height > 0,
      };
    });
    if (stop.end) break;
    order.push(stop.index);
    if (stop.index === -1) failures.push(`Tab focused ${stop.name}, which the page did not list`);
    if (!stop.indicator)
      failures.push(`Tab stop ${order.length}, ${stop.name}: no visible change on focus`);
    if (!stop.sized) failures.push(`Tab stop ${order.length}, ${stop.name}: no size`);
  }
  const expected = [...Array(listed.total).keys()];
  if (order.length === 0) failures.push('Tab focused nothing');
  if (JSON.stringify(order) !== JSON.stringify(expected)) {
    const missed = expected.filter((index) => !order.includes(index));
    const outOfOrder = order.findIndex((index, at) => index !== expected[at]);
    failures.push(
      `Tab reached ${order.length} of ${listed.total} listed elements` +
        (missed.length > 0 ? `, missing #${missed.slice(0, 8).join(', #')}` : '') +
        (outOfOrder >= 0 ? `; first out of order at stop ${outOfOrder + 1}` : ''),
    );
  }
  return failures;
}

/**
 * AX4: in the two-column dashboard the continue card and the Export card are the same height and
 * their actions sit on one line at the cards' bottom padding edge; in the stacked layout the Export
 * card starts below the continue card.
 */
export async function checkCardAlignment(page, twoColumn) {
  return page.evaluate((sideBySide) => {
    const cont = document.querySelector('[data-testid="current-lesson"]');
    const exp = document.querySelector('.export-card');
    const go = cont?.querySelector('.lime-button');
    const button = exp?.querySelector('.export-button');
    if (!cont || !exp || !go || !button) return ['the dashboard is missing a card or its action'];
    const a = cont.getBoundingClientRect();
    const b = exp.getBoundingClientRect();
    // A classic scrollbar would make "901" a narrower layout than it says; overlay scrollbars do
    // not. Checked so the row cannot silently run at a width on the other side of the breakpoint.
    const layout = document.documentElement.clientWidth;
    if (sideBySide && layout <= 900) {
      return [`the layout is ${layout}px wide, not the two-column width this row measures`];
    }
    if (!sideBySide) {
      return b.top >= a.bottom - 1
        ? []
        : ['the cards do not stack: Export starts beside the continue card'];
    }
    const failures = [];
    if (Math.abs(a.height - b.height) > 1) {
      failures.push(
        `continue card is ${Math.round(a.height)}px, Export card ${Math.round(b.height)}px`,
      );
    }
    const style = getComputedStyle(cont);
    const edge = a.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom);
    const goBottom = go.getBoundingClientRect().bottom;
    if (Math.abs(edge - goBottom) > 1) {
      failures.push(
        `continue button ends ${Math.round(edge - goBottom)}px above the card's padding edge`,
      );
    }
    const buttonBottom = button.getBoundingClientRect().bottom;
    if (Math.abs(goBottom - buttonBottom) > 1) {
      failures.push(
        `continue button and Export end ${Math.round(Math.abs(goBottom - buttonBottom))}px apart`,
      );
    }
    return failures;
  }, twoColumn);
}

/**
 * AX4a: the ghost number still renders, as generated content, and Chromium's accessibility tree
 * names the lesson number once — the kicker — not a second time from the decoration.
 */
export async function checkGhost(page) {
  const failures = [];
  const card = page.locator('[data-testid="current-lesson"]');
  const kicker = (await card.locator('.lesson-number').textContent())?.match(/\d\d/)?.[0];
  // The ghost itself, at ghost scale: another pseudo-element that happens to hold two digits must
  // not stand in for a deleted ghost.
  const ghost = await card.evaluate((element) => {
    const host = element.querySelector('.continue-ghost');
    if (!host) return null;
    return ['::before', '::after'].map((pseudo) => {
      const style = getComputedStyle(host, pseudo);
      return { content: style.content, size: parseFloat(style.fontSize) };
    });
  });
  const drawn = (ghost ?? []).some(
    (one) => kicker !== undefined && one.content.includes(kicker) && one.size >= 48,
  );
  if (!drawn) {
    failures.push(
      `the ghost number ${kicker} no longer renders, large, as the ghost's own content`,
    );
  }
  // Counted as a whole number, so a title holding "2010" cannot be mistaken for a second "01".
  // What is said, not where links point: the snapshot's `/url:` lines are addresses, and a lesson
  // address such as …/LS-M020-06 would otherwise count as a second "06".
  const tree = (await card.ariaSnapshot())
    .split('\n')
    .filter((line) => !/^\s*- \/url:/.test(line))
    .join('\n');
  const said = kicker ? (tree.match(new RegExp(`(?<!\\d)${kicker}(?!\\d)`, 'g')) ?? []).length : 0;
  if (said !== 1) {
    failures.push(`the card's accessibility tree says ${kicker} ${said} time(s), not once`);
  }
  return failures;
}

/** Puts focus just before the first focusable element, so the next Tab lands on it. */
async function focusTop(page) {
  await page.evaluate(() => {
    const start = document.createElement('div');
    start.tabIndex = -1;
    document.body.prepend(start);
    start.focus();
    window.scrollTo(0, 0);
  });
}

/**
 * AX2's open drawer, AX3's walks, and AX4/AX4a's dashboard checks. Lesson 6 is walked because it
 * carries a lab kit, a diagram, code blocks and activities on one page; one of its boxes is typed
 * into first, because Get feedback is disabled while every box is empty.
 */
export async function runA11yJourneys(browser, baseUrl) {
  const failures = [];
  const journeys = [
    { name: 'course list', path: '/', contain: [] },
    {
      name: 'dashboard',
      path: '/courses/FSSE',
      contain: [
        ['range selects', '.export-field select', 2],
        ['conversations control', '.export-card input', 1],
        ['Export button', '.export-button', 1],
      ],
    },
    {
      name: 'Lesson 6',
      path: '/courses/FSSE/lessons/LS-M020-06',
      type: true,
      contain: [
        ['lab-kit download', '.lab-kit-download', 1],
        ['Copy buttons', '.code-block-copy', 1],
        ['response boxes', '.response-box', 1],
        ['response Save buttons', '.response-actions .response-save', 1],
        ['Get feedback button', '.feedback-actions .response-save', 1],
        ['diagram source toggle', '.diagram-source > summary', 1],
      ],
    },
  ];
  for (const journey of journeys) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${journey.path}`, { waitUntil: 'networkidle' });
    if (journey.type) await page.locator('.response-box').first().fill('Typed for the walk.');
    await focusTop(page);
    for (const failure of await tabWalk(page, journey.contain)) {
      failures.push(`${journey.name}: ${failure}`);
    }
    await context.close();
  }

  for (const width of [1440, 901, 900, 768, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/courses/FSSE`, { waitUntil: 'networkidle' });
    for (const failure of await checkCardAlignment(page, width > 900)) {
      failures.push(`dashboard at ${width}px: ${failure}`);
    }
    if (width === 1440) {
      for (const failure of await checkGhost(page)) failures.push(`dashboard: ${failure}`);
    }
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/courses/FSSE/lessons/LS-M020-01`, { waitUntil: 'networkidle' });
    await page.locator('.sidebar-trigger').click();
    await page.waitForTimeout(400);
    for (const failure of await checkTargets(page)) {
      failures.push(`Lesson 1 at 375px with the drawer open: ${failure}`);
    }
    await context.close();
  }
  return failures;
}
