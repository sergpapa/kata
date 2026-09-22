/**
 * The activity-panel half of the screenshot gate — criteria V1 and V3 in
 * docs/specs/activity-placement.md, and D5 in docs/specs/acknowledged-saves.md.
 *
 * Kept beside the gate rather than inside it for the same reason diagram-checks.mjs is: these are
 * real checks with their own reasoning, and screenshots.mjs is the harness that runs them.
 */

/**
 * Whether a lesson page carries its activities where they belong and offers the writing surfaces
 * their author declared, or a sentence saying what is wrong.
 *
 * `expected` comes from the API — `{ activities, fields }`, where `fields` is the total of every
 * activity's own `responseFields`. Asked rather than written down, for the reason the count was
 * always asked: a literal 3, or a literal 4 fields each, would make this a test of one content
 * package, and a release that shipped different numbers would fail on all fifteen lessons or pass
 * with work lost.
 *
 * Placed panels and foot panels are counted separately, and that separation is the whole check.
 * Counting them together made this blind to the one regression it exists to catch: if every
 * `source_heading` stopped matching, all of a lesson's activities would fall to the foot, and a
 * check that filtered to the lesson body before asking "is this panel under a heading?" would find
 * nothing to complain about — three panels on the page, none of them placed, green.
 *
 * The field check is written the same way, and for the same reason: `> 0` would pass a page that
 * rendered one box out of twelve, so it is an equality against what the app itself says is due.
 */
export async function checkActivityPanels(page, expected) {
  return page.evaluate(({ activities: count, fields: expectedFields }) => {
    const all = [...document.querySelectorAll('.activity-panel')];
    const placed = all.filter((panel) => panel.closest('.lesson-body'));
    const atFoot = all.filter((panel) => panel.closest('.activity-foot'));

    if (placed.length !== count || atFoot.length !== 0) {
      return `${placed.length} panels beside their sections and ${atFoot.length} at the lesson's foot, expected ${count} and 0`;
    }

    const boxes = [...document.querySelectorAll('.activity-panel .response-field textarea')];
    if (boxes.length !== expectedFields) {
      return `${boxes.length} writing surfaces on the page, expected ${expectedFields}`;
    }

    const unlabelled = boxes.filter((box) => {
      const label = box.id ? document.querySelector(`label[for="${CSS.escape(box.id)}"]`) : null;
      return !label || (label.textContent ?? '').trim() === '';
    });
    if (unlabelled.length > 0) {
      return `${unlabelled.length} writing surfaces have no label of their own`;
    }

    const unsaveable = boxes.filter(
      (box) => !box.closest('.response-field')?.querySelector('button'),
    );
    if (unsaveable.length > 0) {
      return `${unsaveable.length} writing surfaces have no way to save what is typed in them`;
    }

    const unmoored = placed.filter((panel) => {
      let previous = panel.previousElementSibling;
      while (previous && !/^H[1-6]$/.test(previous.tagName)) {
        previous = previous.previousElementSibling;
      }
      return previous === null;
    });
    if (unmoored.length > 0) {
      return `${unmoored.length} panels sit under no heading`;
    }

    const invisible = all.filter((panel) => {
      const box = panel.getBoundingClientRect();
      return box.width === 0 || box.height === 0;
    });
    return invisible.length > 0 ? `${invisible.length} panels render with no box` : 'ok';
  }, expected);
}
