/**
 * The activity-panel half of the screenshot gate — criteria V1 and V3 in
 * docs/specs/activity-placement.md.
 *
 * Kept beside the gate rather than inside it for the same reason diagram-checks.mjs is: these are
 * real checks with their own reasoning, and screenshots.mjs is the harness that runs them.
 */

/**
 * Whether a lesson page carries its activities where they belong, or a sentence saying what is
 * wrong. `expected` is how many activities the app says this lesson has, asked of the API rather
 * than written down — a literal would make this a test of one content package.
 *
 * Placed panels and foot panels are counted separately, and that separation is the whole check.
 * Counting them together made this blind to the one regression it exists to catch: if every
 * `source_heading` stopped matching, all of a lesson's activities would fall to the foot, and a
 * check that filtered to the lesson body before asking "is this panel under a heading?" would find
 * nothing to complain about — three panels on the page, none of them placed, green.
 */
export async function checkActivityPanels(page, expected) {
  return page.evaluate((count) => {
    const all = [...document.querySelectorAll('.activity-panel')];
    const placed = all.filter((panel) => panel.closest('.lesson-body'));
    const atFoot = all.filter((panel) => panel.closest('.activity-foot'));

    if (placed.length !== count || atFoot.length !== 0) {
      return `${placed.length} panels beside their sections and ${atFoot.length} at the lesson's foot, expected ${count} and 0`;
    }

    const typeable = all.filter(
      (panel) =>
        panel.querySelectorAll('input, textarea, select, button, [contenteditable]').length > 0,
    );
    if (typeable.length > 0) {
      return `${typeable.length} panels offer somewhere to type, and nothing is saved yet`;
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
