/**
 * Finds the author's worked answer for an activity: the section under the heading its
 * `feedback_source_heading` names, in the activity's own lesson (docs/specs/practice-feedback.md
 * PF2, PF3). Null when there is no such heading, or more than one.
 */
export function workedAnswerSection(
  lessonSource: string,
  heading: string | null | undefined,
): string | null {
  void lessonSource;
  void heading;
  throw new Error('not implemented');
}
