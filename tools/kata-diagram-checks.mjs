/**
 * The Kata-diagram half of the screenshot gate: criteria KD10 to KD12 and KD20 in
 * docs/specs/kata-diagrams.md, checked in real Chromium because jsdom applies no stylesheet.
 *
 * A Kata diagram is drawn from the page's own elements (ADR 0025), so unlike a Mermaid frame it can
 * be measured directly: its box against the lesson column, every element inside it against its
 * box, and its ink against its paper.
 */
import { contrast, rgb } from './diagram-checks.mjs';

/** Below this viewport the diagram must be in its one-row-per-step form; at 1440, in columns. */
const LIST_AT = 375;
const COLUMNS_AT = 1440;

/** Everything the page can say about its Kata diagrams, read in one evaluation. */
async function readKataDiagrams(page) {
  await page.waitForSelector('.kata-diagram', { timeout: 15_000 }).catch(() => {});
  return page.evaluate(() => {
    /** The first opaque background at or above an element: what its text is painted on. */
    const paperOf = (element) => {
      for (let at = element; at; at = at.parentElement) {
        const colour = getComputedStyle(at).backgroundColor;
        if (colour && colour !== 'rgba(0, 0, 0, 0)' && colour !== 'transparent') return colour;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0;
    };

    const column = document.querySelector('.lesson-body')?.getBoundingClientRect();
    const notice = document.querySelector('.diagram [role="status"]')?.textContent ?? '';
    return {
      frames: document.querySelectorAll('.diagram iframe').length,
      notice: notice.trim(),
      diagrams: [...document.querySelectorAll('.kata-diagram')].map((diagram) => {
        const box = diagram.getBoundingClientRect();
        const spill = [...diagram.querySelectorAll('*')]
          .filter((element) => visible(element))
          .filter((element) => {
            const inner = element.getBoundingClientRect();
            return inner.right > box.right + 1 || inner.left < box.left - 1;
          })
          .map((element) => (element.textContent ?? element.tagName).trim().slice(0, 60));
        // An inner box that scrolls is a diagram the reader still has to scroll sideways.
        const innerScroll = [...diagram.querySelectorAll('*')].filter(
          (element) =>
            visible(element) &&
            getComputedStyle(element).overflowX !== 'visible' &&
            element.scrollWidth > element.clientWidth + 1,
        ).length;
        // KD7: a reply is dashed and a key step is heavier, never colour alone. Straight arrows
        // only (not a step's loop on its own lifeline), and each must be its top edge alone: a
        // second edge is a doubled, heavier line that reads as something else.
        const arrowOf = (selector) => {
          const arrow = diagram.querySelector(
            `${selector}:is([data-towards='left'], [data-towards='right']) .kd-arrow`,
          );
          if (!arrow || !visible(arrow)) return null;
          const style = getComputedStyle(arrow);
          return {
            dash: style.borderTopStyle,
            weight: parseFloat(style.borderTopWidth),
            others: ['Right', 'Bottom', 'Left'].reduce(
              (sum, side) => sum + parseFloat(style[`border${side}Width`]),
              0,
            ),
          };
        };
        const marker = diagram.querySelector('[data-highlight] .kd-key');
        // KD12: every kind of text the diagram writes, each measured on its own paper.
        const inks = [
          '.kd-say',
          '.kd-note',
          '.kd-who',
          '.kd-key',
          '.kd-phase-label',
          '.kd-participant-label',
          '.kd-participant-note',
          'figcaption',
        ].flatMap((selector) => {
          const element = diagram.querySelector(selector);
          if (!element || !visible(element)) return [];
          return [{ selector, ink: getComputedStyle(element).color, paper: paperOf(element) }];
        });
        return {
          left: box.left,
          right: box.right,
          width: Math.round(box.width),
          scrolls: diagram.scrollWidth > diagram.clientWidth + 1,
          spill,
          steps: diagram.querySelectorAll('ol > li').length,
          arrows: [...diagram.querySelectorAll('.kd-arrow')].filter((arrow) => visible(arrow))
            .length,
          innerScroll,
          plain: arrowOf('li:not([data-reply]):not([data-highlight])'),
          reply: arrowOf('li[data-reply]'),
          highlight: arrowOf('li[data-highlight]'),
          marker: marker ? visible(marker) : false,
          inks,
        };
      }),
      column: column ? { left: column.left, right: column.right } : null,
    };
  });
}

/**
 * Every Kata-diagram claim one route makes. Pushes onto `failures` rather than throwing, so one
 * run reports all of them. Returns whether there is a diagram to photograph.
 */
export async function checkKataDiagram(page, route, size, scheme, failures) {
  const where = `${route.name} (${scheme}) at ${size.width}px`;
  const read = await readKataDiagrams(page);

  if (read.diagrams.length !== 1) {
    failures.push(
      `${where} drew ${read.diagrams.length} Kata diagram(s), expected 1` +
        (read.notice ? ` — the page says: ${read.notice}` : ''),
    );
    return false;
  }
  if (read.frames !== 0) {
    failures.push(`${where} has ${read.frames} diagram frame(s); a drawn Kata diagram needs none`);
  }
  if (read.notice !== '') {
    failures.push(`${where} shows a diagram notice: ${read.notice}`);
  }

  const [diagram] = read.diagrams;

  // KD10: no wider than the column, and nothing inside it sideways.
  if (!read.column) {
    failures.push(`${where} has no .lesson-body to measure the diagram against`);
  } else if (diagram.left < read.column.left - 1 || diagram.right > read.column.right + 1) {
    failures.push(
      `${where} draws a ${diagram.width}px Kata diagram outside its lesson column ` +
        `(${Math.round(diagram.left)}–${Math.round(diagram.right)} in ` +
        `${Math.round(read.column.left)}–${Math.round(read.column.right)})`,
    );
  }
  if (diagram.scrolls || diagram.innerScroll > 0) {
    failures.push(
      `${where} has a Kata diagram that scrolls sideways (` +
        `${diagram.scrolls ? 'its own box' : `${diagram.innerScroll} box(es) inside it`})`,
    );
  }
  if (diagram.spill.length > 0) {
    failures.push(
      `${where} has ${diagram.spill.length} element(s) past the Kata diagram's edge, the first ` +
        `holding ${JSON.stringify(diagram.spill[0])}`,
    );
  }

  // KD11: columns where there is room, one row per step where there is not.
  if (diagram.steps < 5) {
    failures.push(
      `${where} has a Kata diagram of ${diagram.steps} step(s); too few to be authored`,
    );
  }
  if (size.width === COLUMNS_AT && diagram.arrows === 0) {
    failures.push(`${where} shows no arrows: the Kata diagram is not in columns at full width`);
  }
  if (size.width === LIST_AT && diagram.arrows !== 0) {
    failures.push(
      `${where} shows ${diagram.arrows} arrow(s): the Kata diagram is not one row per step on a phone`,
    );
  }

  // KD7: where arrows are drawn, a reply's is dashed and a key step's is heavier than a plain
  // one; on every layout the key step carries a visible marker.
  if (!diagram.marker) {
    failures.push(`${where} shows no marker on the Kata diagram's key step`);
  }
  if (diagram.plain && diagram.reply && diagram.reply.dash !== 'dashed') {
    failures.push(`${where} draws a reply arrow ${diagram.reply.dash}, expected dashed`);
  }
  for (const [kind, arrow] of [
    ['plain', diagram.plain],
    ['reply', diagram.reply],
    ['key step', diagram.highlight],
  ]) {
    if (arrow && arrow.others !== 0) {
      failures.push(
        `${where} draws a ${kind} arrow with ${arrow.others}px of edges besides its line`,
      );
    }
  }
  if (diagram.plain && diagram.highlight && !(diagram.highlight.weight > diagram.plain.weight)) {
    failures.push(
      `${where} draws the key step's arrow ${diagram.highlight.weight}px, no heavier than a ` +
        `plain arrow's ${diagram.plain.weight}px`,
    );
  }

  // KD12: every kind of diagram text is legible on whatever it is painted on.
  if (!diagram.inks.some((one) => one.selector === '.kd-say')) {
    failures.push(`${where} shows no Kata step text to measure`);
  }
  for (const { selector, ink: inkValue, paper: paperValue } of diagram.inks) {
    const ink = rgb(inkValue);
    const paper = rgb(paperValue);
    if (!ink || !paper) {
      failures.push(
        `${where} cannot measure Kata ${selector}: ${JSON.stringify(inkValue)} on ` +
          `${JSON.stringify(paperValue)}`,
      );
    } else if (contrast(ink, paper) < 4.5) {
      failures.push(
        `${where} draws Kata ${selector} at ${contrast(ink, paper).toFixed(2)}:1 ` +
          `(${inkValue} on ${paperValue}), below 4.5:1`,
      );
    }
  }

  return true;
}
