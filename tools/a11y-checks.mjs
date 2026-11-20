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
 * AX1 and AX2 for one captured route: axe at the two ends of the width range, and the target sizes
 * at 375 once (`firstScheme`), because they do not depend on the colour scheme.
 */
export async function checkRouteA11y(page, routeName, scheme, width, firstScheme) {
  const failures = [];
  if (width !== 768) {
    for (const found of await checkAxe(page)) {
      failures.push(`${routeName} (${scheme}) at ${width}px: ${found}`);
    }
  }
  if (width === 375 && firstScheme) {
    for (const found of await checkTargets(page)) failures.push(`${routeName} at 375px: ${found}`);
  }
  return failures;
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
