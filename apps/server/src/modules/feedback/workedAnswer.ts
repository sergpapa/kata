/**
 * Finds the author's worked answer for an activity: the section under the heading its
 * `feedback_source_heading` names, in the activity's own lesson (docs/specs/practice-feedback.md
 * PF2, PF3).
 *
 * A line scanner rather than a Markdown parser: the server has no Markdown dependency, and the two
 * things that matter here — ATX headings and fenced code — are line-shaped. Null when the name is
 * missing, matches no heading, or matches more than one: coaching against a guessed answer key is
 * worse than coaching against none, and the panel says which it is.
 */

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

interface Heading {
  readonly line: number;
  readonly depth: number;
  readonly text: string;
}

/** The characters a reader sees: inline code and emphasis markers dropped, spacing collapsed. */
function visible(text: string): string {
  return text.replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
}

/** Every ATX heading outside a fenced code block, in order. */
function headingsOf(lines: readonly string[]): Heading[] {
  const headings: Heading[] = [];
  let fence: { readonly char: string; readonly length: number } | null = null;

  for (const [index, line] of lines.entries()) {
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      // A fence closes only on the same character, at least as long, with nothing after it.
      if (
        fenceMatch &&
        fenceMatch[1]?.[0] === fence.char &&
        (fenceMatch[1]?.length ?? 0) >= fence.length &&
        line.trim() === fenceMatch[1]
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      const marker = fenceMatch[1] as string;
      fence = { char: marker[0] as string, length: marker.length };
      continue;
    }
    const headingMatch = HEADING.exec(line);
    if (headingMatch) {
      headings.push({
        line: index,
        depth: (headingMatch[1] as string).length,
        text: (headingMatch[2] as string).trim(),
      });
    }
  }
  return headings;
}

export function workedAnswerSection(
  lessonSource: string,
  heading: string | null | undefined,
): string | null {
  if (!heading || heading.trim() === '') return null;

  const lines = lessonSource.split(/\r?\n/);
  const headings = headingsOf(lines);
  const wanted = heading.trim();
  const matches = headings.filter(
    (candidate) => candidate.text === wanted || visible(candidate.text) === visible(wanted),
  );
  if (matches.length !== 1) return null;

  const found = matches[0] as Heading;
  const next = headings.find(
    (candidate) => candidate.line > found.line && candidate.depth <= found.depth,
  );
  const body = lines.slice(found.line + 1, next ? next.line : lines.length).join('\n');
  return body.replace(/^\s*\n/, '').trimEnd();
}
