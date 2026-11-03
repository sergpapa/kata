import { twoDigits } from '../format.js';

/**
 * The file a reader takes away when the app could not store their answer.
 *
 * Pure on purpose, and separate from anything that touches a clipboard or a DOM: what goes in the
 * file is the part worth pinning character for character, and it is worth pinning without a browser
 * in the way (docs/specs/save-failure-recovery.md, criteria F4 and F5).
 */

/** Which lesson an answer belongs to, as the page already knows it from `GET /api/courses/:courseId/lessons/:id`. */
export interface LessonContext {
  readonly order: number;
  readonly candidateLessonId: string;
  readonly displayTitle: string;
  readonly contentVersion: string;
  readonly releaseId: string;
  readonly releaseVersion: string;
}

/** One answer leaving the app: whose it is, what it answers, and the characters themselves. */
export interface RecoverySubject {
  readonly lesson: LessonContext;
  readonly activityId: string;
  /** The author's own name for the field, which is what any export keys on. */
  readonly fieldName: string;
  /** What the reader calls it — "Your prediction", not "prediction". */
  readonly label: string;
  readonly text: string;
}

/**
 * The line that separates what we say about the answer from the answer itself.
 *
 * Everything after it is the reader's characters and nothing else. That is the whole contract of
 * this file, and it is why the text is never fenced: most activities in this release ask about HTTP
 * messages, so an answer containing three backticks is the ordinary case rather than the exotic
 * one, and a fence around it would end in the middle of the reader's own sample.
 */
const RULE = '\n---\n\n';

/**
 * One header value, forced onto one line.
 *
 * Every value in the header comes out of the release except the reader's own text, and this app
 * does not trust content (ADR 0005). The rule below the header is the whole contract of this file —
 * everything after it is the reader's characters and nothing else — and a title carrying a newline
 * and three dashes would write a rule of its own, so the reader's recovered answer would begin in
 * the middle of our header or disappear into it.
 *
 * Replaced with a space rather than deleted, for the same reason nothing else in this app deletes
 * content silently: a lesson title whose newline was swallowed misnames the lesson.
 */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

export function recoveryDocument(subject: RecoverySubject, writtenAt: Date): string {
  const { lesson } = subject;
  const header = [
    `# Unsaved answer — Lesson ${twoDigits(lesson.order)}: ${oneLine(lesson.displayTitle)}`,
    '',
    `- Activity: ${oneLine(subject.activityId)}`,
    // Both names: the label is what the reader recognises on the page, and the authored name is
    // what the release and any later export key on. A file carrying one of them cannot be placed
    // back against the other.
    `- Field: ${oneLine(subject.label)} (${oneLine(subject.fieldName)})`,
    `- Lesson: ${oneLine(lesson.candidateLessonId)}, content version ${oneLine(lesson.contentVersion)}`,
    `- Release: ${oneLine(lesson.releaseId)} ${oneLine(lesson.releaseVersion)}`,
    // An instant, not `storedWhen`'s locale wording. This file is written to be kept, and possibly
    // to be sent to the content author, which means it is read on a machine that is not this one.
    `- Written out: ${writtenAt.toISOString()}`,
    `- The app never acknowledged this text. Nothing was stored for it.`,
  ].join('\n');

  return `${header}${RULE}${subject.text}`;
}

/** Everything a file name cannot safely carry, including the separators of both OS conventions. */
const UNSAFE = /[^A-Za-z0-9._-]+/g;

/**
 * An id as a file name segment.
 *
 * An activity id and a field name are both content: nothing in the release format promises either
 * is free of a slash, a space or a colon, and a slash in particular would write the file into a
 * directory nobody asked for. Runs collapse and edges are trimmed so nothing ends in a dangling
 * dash, and a segment with nothing safe in it becomes empty rather than a row of punctuation.
 */
function segment(value: string): string {
  return value
    .replace(UNSAFE, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function recoveryFileName(subject: RecoverySubject): string {
  const parts = [
    'unsaved',
    `lesson-${twoDigits(subject.lesson.order)}`,
    segment(subject.activityId),
    segment(subject.fieldName),
  ];
  // Empty segments drop out rather than leaving `--` behind them. A name of only the lesson number
  // is still a usable name; one that reads `unsaved-lesson-04--.md` looks like a bug to whoever
  // finds it in their downloads folder.
  return `${parts.filter(Boolean).join('-')}.md`;
}
