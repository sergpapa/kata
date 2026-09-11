import { findFirstHeadingOne, splitFrontMatter } from './frontMatter.js';

/**
 * Turns a stored lesson file into what a reader is given: the Markdown below its title, and the
 * front-matter fields a learner is meant to see. The stored `source_text` is never rewritten —
 * these are derived views of it (ADR 0005, REQ-40).
 */

/** One selected front-matter field, already labelled in words a learner reads. */
export type LessonFact =
  | { readonly key: string; readonly label: string; readonly kind: 'line'; readonly text: string }
  | {
      readonly key: string;
      readonly label: string;
      readonly kind: 'list';
      readonly items: readonly string[];
    };

/**
 * An allow-list, in the order a reader meets the facts — never a deny-list. Four of the five
 * authored lessons carry `exercise_kit`, a zip filename; a deny-list with one gap ships it into the
 * panel. Anything not named here (document_id, version, module, candidate_lesson_id, date,
 * adapted_from, exercise_kit) is identity or packaging, and belongs to the provenance line.
 */
const LEARNER_FACING_FIELDS: readonly (readonly [string, string])[] = [
  ['audience', 'Who this lesson is for'],
  ['status', 'Status'],
  ['prerequisites', 'Before you start'],
  ['learning_outcomes', 'What you will be able to do'],
  ['introduced_concepts', 'New ideas in this lesson'],
  ['runtime_target', 'What the author ran it against'],
  ['assessment_scope', 'What this does and does not assess'],
  ['deferred', 'Left for later lessons'],
  ['examples', 'About the examples'],
];

/**
 * Whatever YAML made of a value, rendered as something a person can read. An unexpected shape is
 * shown as its JSON rather than hidden or flattened to "[object Object]": the author needs to see
 * that their front matter has a shape this app did not expect.
 */
function readableText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}

/** The selected facts, in the fixed order above, skipping every field the lesson does not carry. */
export function learnerFacingFacts(frontMatter: Record<string, unknown>): readonly LessonFact[] {
  const facts: LessonFact[] = [];

  for (const [key, label] of LEARNER_FACING_FIELDS) {
    const value = frontMatter[key];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const items = value.map(readableText).filter((item) => item !== '');
      if (items.length > 0) facts.push({ key, label, kind: 'list', items });
      continue;
    }

    const text = readableText(value);
    if (text !== '') facts.push({ key, label, kind: 'line', text });
  }

  return facts;
}

/**
 * The lesson body with its front-matter block and its title heading removed, and nothing else
 * touched. Every remaining character stays exactly as the author wrote it, including the blank
 * line that separates headers from body inside an HTTP sample — trimming here would eat it.
 *
 * Only the *first* H1 is the title (handoff §4), so a later one is left in the body for the
 * renderer to demote.
 */
export function lessonBodyBelowTitle(sourceText: string): string {
  const split = splitFrontMatter(sourceText);
  const body = split.ok ? split.value.body : sourceText;

  const heading = findFirstHeadingOne(body);
  if (!heading) return body;

  const lines = body.split('\n');
  lines.splice(heading.startLine, heading.lineCount);
  return lines.join('\n');
}
