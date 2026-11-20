/**
 * The journeys of docs/specs/accessibility-pass.md: the Tab walks (AX3), the dashboard's two cards
 * (AX4) and its ghost number (AX4a), and the open drawer's targets (AX2). Split out of
 * a11y-checks.mjs, which keeps the checks run on every captured route, by the file-size rule.
 */
import { checkTargets, tabWalk } from './a11y-checks.mjs';

/**
 * AX4: in the two-column dashboard the continue card and the Export card are the same height and
 * their actions sit on one line at the cards' bottom padding edge; in the stacked layout the Export
 * card starts below the continue card.
 */
export async function checkCardAlignment(page, twoColumn) {
  // The continue card's contents rise into place on load; the criterion is about where they rest.
  // Measured mid-animation the button sat up to 2px low on a loaded machine.
  await page.evaluate(() => Promise.all(document.getAnimations().map((one) => one.finished)));
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
    // Measured once the drawer has finished arriving, not after a guessed delay: open, visible,
    // fully on screen, and in the same place on two readings 100ms apart (code review).
    await page.waitForFunction(
      () => {
        const drawer = document.querySelector('.sidebar[data-open="true"]');
        if (!drawer || getComputedStyle(drawer).visibility === 'hidden') return false;
        const box = drawer.getBoundingClientRect();
        const reading = `${box.left},${box.top},${box.width},${box.height}`;
        const settled = window.__drawerReading === reading && box.left >= 0;
        window.__drawerReading = reading;
        return settled;
      },
      null,
      { polling: 100, timeout: 10_000 },
    );
    for (const failure of await checkTargets(page)) {
      failures.push(`Lesson 1 at 375px with the drawer open: ${failure}`);
    }
    await context.close();
  }
  return failures;
}
