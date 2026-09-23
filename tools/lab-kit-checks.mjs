/**
 * The lab-kit half of the screenshot gate — criterion V4 in docs/specs/lab-downloads.md.
 *
 * Kept beside the gate rather than inside it for the same reason activity-checks.mjs is: these are
 * real checks with their own reasoning, and screenshots.mjs is the harness that runs them.
 */

/**
 * Whether a lesson page offers the kit the app itself says that lesson has, or a sentence saying
 * what is wrong.
 *
 * `expected` comes from the API — the `labKit` the lesson answered with, or `null`. Asked rather
 * than written down, for the same reason the activity count is: a filename written into this file
 * would make the gate a test of one content package, and the 1.0.1 reissue already moved two kits'
 * versions once.
 *
 * The two halves are asserted separately and both matter. A lesson that shows no panel when it has
 * a kit is the obvious failure; a lesson that shows one when it has none is the quieter one, and it
 * is the only lesson a reader meets first.
 */
export async function checkLabKit(page, expected) {
  return page.evaluate((kit) => {
    const panels = [...document.querySelectorAll('.lab-kit')];

    if (!kit) {
      if (panels.length > 0) return `${panels.length} kit panels on a lesson that declares none`;
      const none = document.querySelector('.lab-kit-none');
      // Silence and a panel that failed to render look identical to a reader, so the sentence is
      // part of the contract rather than a nicety.
      return none && (none.textContent ?? '').trim() !== ''
        ? 'ok'
        : 'a lesson with no kit says nothing about it at all';
    }

    if (panels.length !== 1) return `${panels.length} kit panels on the page, expected 1`;
    const panel = panels[0];
    const text = panel.textContent ?? '';

    if (!text.includes(kit.fileName)) {
      return `the kit panel does not name ${kit.fileName}`;
    }
    // The whole hash. Four handoffs ask the reader to compare it against the registry, and a
    // truncated one cannot be compared.
    if (!text.includes(kit.sha256)) {
      return `the kit panel does not carry the whole SHA-256 of ${kit.fileName}`;
    }

    const link = panel.querySelector('a[href]');
    const href = link?.getAttribute('href') ?? '';
    if (!href.includes(encodeURIComponent(kit.labId))) {
      return `the kit panel's download points at ${href || 'nothing'}, not at ${kit.labId}`;
    }

    const box = panel.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return 'the kit panel renders with no box';

    // A control the reader cannot see the edges of, or that has been pushed off the card, is not a
    // control. Only a real stylesheet can show either, which is why this lives in the gate.
    const linkBox = link.getBoundingClientRect();
    if (linkBox.width === 0 || linkBox.height === 0) {
      return 'the download control renders with no box';
    }
    if (linkBox.right > document.documentElement.clientWidth) {
      return `the download control runs ${Math.round(linkBox.right - document.documentElement.clientWidth)}px past the right edge of the page`;
    }

    return 'ok';
  }, expected);
}

/**
 * Whether every code block on the page offers a copy, and none of them hides the sample to do it.
 *
 * Counted against the blocks actually on the page rather than against a number written here: a
 * diagram that drew replaced its own source block, and a lesson's fence count is the author's.
 */
export async function checkCopyButtons(page) {
  return page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.code-block')];
    if (blocks.length === 0) return 'ok';

    const without = blocks.filter((block) => !block.querySelector('.code-block-copy'));
    if (without.length > 0) {
      return `${without.length} of ${blocks.length} code blocks offer no copy`;
    }

    const inside = blocks.filter((block) => block.querySelector('pre .code-block-copy'));
    if (inside.length > 0) {
      // Text inside the `pre` becomes part of the sample, and a reader who copies it copies the
      // word "Copy" along with their command.
      return `${inside.length} copy buttons sit inside the sample they copy`;
    }

    const covering = blocks.filter((block) => {
      const button = block.querySelector('.code-block-copy').getBoundingClientRect();
      const sample = block.querySelector('pre').getBoundingClientRect();
      return button.bottom > sample.top + 1 && button.top < sample.bottom - 1;
    });
    if (covering.length > 0) {
      return `${covering.length} copy buttons overlap the first line of their sample`;
    }

    return 'ok';
  });
}
