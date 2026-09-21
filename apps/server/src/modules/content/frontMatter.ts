import { parse as parseYaml } from 'yaml';

export interface FrontMatterSplit {
  readonly frontMatter: Record<string, unknown>;
  readonly body: string;
}

export type FrontMatterProblem =
  | { readonly kind: 'missing'; readonly detail: string }
  | { readonly kind: 'invalid'; readonly detail: string };

/**
 * Splits an authored lesson into its YAML front matter and its Markdown. Returns the problem
 * rather than throwing, because every refusal has to reach the owner naming the file it came from.
 *
 * The delimiter must open on the first line: front matter further down is a `---` rule in the prose.
 */
export function splitFrontMatter(
  source: string,
): { ok: true; value: FrontMatterSplit } | { ok: false; problem: FrontMatterProblem } {
  const withoutBom = source.startsWith('﻿') ? source.slice(1) : source;
  const opening = /^---\r?\n/.exec(withoutBom);
  if (!opening) {
    return { ok: false, problem: { kind: 'missing', detail: 'it does not open with a --- block' } };
  }

  const rest = withoutBom.slice(opening[0].length);
  const closing = /^---[ \t]*(\r?\n|$)/m.exec(rest);
  if (!closing || closing.index === undefined) {
    return {
      ok: false,
      problem: { kind: 'missing', detail: 'its --- block is never closed' },
    };
  }

  const yamlText = rest.slice(0, closing.index);
  const body = rest.slice(closing.index + closing[0].length);

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlText) as unknown;
  } catch (error) {
    return {
      ok: false,
      problem: {
        kind: 'invalid',
        detail: (error as Error).message.split('\n')[0] ?? 'unparseable',
      },
    };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      problem: { kind: 'invalid', detail: 'its front matter is not a block of named fields' },
    };
  }

  // A YAML alias cycle parses into a circular object, which every consumer downstream stores or
  // renders via JSON.stringify — an uncaught crash instead of a named refusal. Refuse it here,
  // where the file is still known.
  try {
    JSON.stringify(parsed);
  } catch {
    return {
      ok: false,
      problem: {
        kind: 'invalid',
        detail: 'its front matter refers to itself (a YAML alias cycle), so it cannot be stored',
      },
    };
  }

  return { ok: true, value: { frontMatter: parsed as Record<string, unknown>, body } };
}

/** Where the title heading sits, so a caller can read it or cut it out without scanning twice. */
export interface HeadingOneLocation {
  readonly text: string;
  /** Index into `body.split('\n')`. */
  readonly startLine: number;
  /** 1 for `# Title`, 2 for a title underlined with `===`. */
  readonly lineCount: 1 | 2;
}

/**
 * Locates the first level-one heading of the lesson body — the display title, never the filename
 * (handoff §4). Setext headings count: an underlined first line is still an H1. A `#` inside a
 * fenced block is a comment in someone's shell script, not a heading.
 */
export function findFirstHeadingOne(body: string): HeadingOneLocation | undefined {
  const lines = body.split('\n');
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] as string;
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const atx = /^\s{0,3}#\s+(.+?)\s*#*\s*$/.exec(line);
    if (atx?.[1]) return { text: atx[1].trim(), startLine: index, lineCount: 1 };

    const next = lines[index + 1];
    if (line.trim() !== '' && next !== undefined && /^\s{0,3}=+\s*$/.test(next)) {
      return { text: line.trim(), startLine: index, lineCount: 2 };
    }
  }
  return undefined;
}

/** The display title itself, for the importer, which stores it beside the lesson. */
export function firstHeadingOneText(body: string): string | undefined {
  return findFirstHeadingOne(body)?.text;
}
