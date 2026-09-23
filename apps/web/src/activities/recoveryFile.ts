import { twoDigits } from '../format.js';

/**
 * The file a reader takes away when the app could not store their answer.
 *
 * Pure on purpose, and separate from anything that touches a clipboard or a DOM: what goes in the
 * file is the part worth pinning character for character, and it is worth pinning without a browser
 * in the way (docs/specs/save-failure-recovery.md, criteria F4 and F5).
 */

/** Which lesson an answer belongs to, as the page already knows it from `GET /api/lessons/:id`. */
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

export function recoveryDocument(_subject: RecoverySubject, _writtenAt: Date): string {
  throw new Error('not implemented');
}

export function recoveryFileName(_subject: RecoverySubject): string {
  throw new Error('not implemented');
}

// Referenced so the import survives the red commit; the implementation uses it for the lesson
// number.
void twoDigits;
