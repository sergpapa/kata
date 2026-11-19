/**
 * Readers for the export file, used by the export suites (docs/specs/export.md).
 *
 * They read the file the way its reader does — by fenced block and by heading — so a test can
 * check a fact inside the section of the thing it describes. Split out of `exportFixture.ts`, which
 * keeps the release and app builders.
 */

export interface FencedBlock {
  /** The opening fence line: three or more backticks and an optional info string. */
  readonly opener: string;
  /** Exactly the lines between the fences, joined with `\n`. */
  readonly content: string;
  /** The last non-blank line before the opening fence (EX6). */
  readonly description: string;
}

interface Line {
  readonly text: string;
  /** True for fence lines and every line between them. */
  readonly fenced: boolean;
}

/** Each line with whether it belongs to a fenced block, read as CommonMark reads backtick fences. */
function classify(markdown: string): Line[] {
  const lines: Line[] = [];
  let fence: string | null = null;
  for (const text of markdown.split('\n')) {
    if (fence === null) {
      const opener = /^(`{3,})[^`]*$/.exec(text);
      if (opener) fence = opener[1] as string;
      lines.push({ text, fenced: opener !== null });
    } else {
      const run = /^(`{3,})\s*$/.exec(text);
      if (run && (run[1] as string).length >= fence.length) fence = null;
      lines.push({ text, fenced: true });
    }
  }
  return lines;
}

/** The file's fenced blocks: each closes at the first line of only backticks at least as long. */
export function fencedBlocks(markdown: string): FencedBlock[] {
  const lines = markdown.split('\n');
  const blocks: FencedBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const opener = /^(`{3,})[^`]*$/.exec(lines[index] as string);
    if (!opener) {
      index += 1;
      continue;
    }
    const fence = opener[1] as string;
    let description = '';
    for (let back = index - 1; back >= 0; back -= 1) {
      if ((lines[back] as string).trim() !== '') {
        description = lines[back] as string;
        break;
      }
    }
    let close = index + 1;
    while (close < lines.length) {
      const run = /^(`{3,})\s*$/.exec(lines[close] as string);
      if (run && (run[1] as string).length >= fence.length) break;
      close += 1;
    }
    blocks.push({
      opener: lines[index] as string,
      content: lines.slice(index + 1, close).join('\n'),
      description,
    });
    index = close + 1;
  }
  return blocks;
}

/** The one block whose content is exactly `text`. Throws when there is none, or several. */
export function blockWith(markdown: string, text: string): FencedBlock {
  const found = fencedBlocks(markdown).filter((block) => block.content === text);
  if (found.length !== 1) {
    throw new Error(`Expected one block holding ${JSON.stringify(text)}, found ${found.length}.`);
  }
  return found[0] as FencedBlock;
}

/** Every line that is not inside a fenced block, fences included. */
export function linesOutsideFences(markdown: string): string[] {
  return classify(markdown)
    .filter((line) => !line.fenced)
    .map((line) => line.text);
}

function headingLevel(line: Line): number {
  if (line.fenced) return 0;
  const hashes = /^(#{1,6}) /.exec(line.text);
  return hashes ? (hashes[1] as string).length : 0;
}

/** Everything before the first `## ` heading: the context block (EX2). */
export function contextBlock(markdown: string): string {
  const lines = classify(markdown);
  const end = lines.findIndex((line) => headingLevel(line) === 2);
  return lines
    .slice(0, end === -1 ? lines.length : end)
    .map((line) => line.text)
    .join('\n');
}

/**
 * The section at heading `level` that holds the first unfenced line containing `marker`: from that
 * section's heading to the next heading of the same or a higher level. A lesson is level 2 (found
 * by its document id), an activity level 3 (by its activity id), a field level 4 (by its label).
 * Throws when the marker is not under a heading of that level, so a flat file fails loudly.
 */
export function section(markdown: string, marker: string, level: 2 | 3 | 4): string {
  const lines = classify(markdown);
  const at = lines.findIndex((line) => !line.fenced && line.text.includes(marker));
  if (at === -1) throw new Error(`No unfenced line contains ${JSON.stringify(marker)}.`);
  let start = at;
  while (start >= 0 && headingLevel(lines[start] as Line) !== level) {
    const found = headingLevel(lines[start] as Line);
    if (found !== 0 && found < level) start = -1;
    else start -= 1;
  }
  if (start < 0)
    throw new Error(`${JSON.stringify(marker)} is not inside a level-${level} section.`);
  let end = at + 1;
  while (end < lines.length) {
    const found = headingLevel(lines[end] as Line);
    if (found !== 0 && found <= level) break;
    end += 1;
  }
  return lines
    .slice(start, end)
    .map((line) => line.text)
    .join('\n');
}

/** The field section headed by `label` inside an activity's section. */
export function fieldSection(activity: string, label: string): string {
  const lines = activity.split('\n');
  const heading = lines.findIndex((line) => line === `#### ${label}`);
  if (heading === -1) throw new Error(`No "#### ${label}" heading in this activity.`);
  return section(lines.slice(heading).join('\n'), label, 4);
}

/** The first unfenced line of `text` carrying `key:`, without any `- ` list marker. */
export function labelledLine(text: string, key: string): string {
  const line = linesOutsideFences(text)
    .map((one) => one.replace(/^- /, ''))
    .find((one) => one.startsWith(`${key}:`));
  if (line === undefined) throw new Error(`No "${key}:" line here.`);
  return line;
}

/** The context block's line carrying `key:` (EX2). */
export function contextLine(markdown: string, key: string): string {
  return labelledLine(contextBlock(markdown), key);
}
