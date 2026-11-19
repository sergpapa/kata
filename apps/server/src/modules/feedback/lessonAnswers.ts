import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import { loadActivitySetText, loadLesson } from '../content/repository.js';
import { workedAnswerSection } from './workedAnswer.js';

/**
 * Each activity's worked answer, from the release's own stored bytes (PF2, PF3).
 *
 * `feedback_source_heading` is read here rather than added to `LessonActivity`: that type is what
 * the lesson answer carries to the page, and the heading is the server's business. Answers are
 * kept per activity once found; a release row never changes once written (ADR 0006).
 */
export function workedAnswerLookup(
  db: Db,
  releaseRowId: number,
): (activity: LessonActivity) => string | null {
  let headings: ReadonlyMap<string, string> | undefined;
  const answers = new Map<string, string | null>();

  const headingOf = (activityId: string): string | undefined => {
    if (!headings) {
      const parsed = JSON.parse(loadActivitySetText(db, releaseRowId) ?? '{}') as {
        activities?: { activity_id?: unknown; feedback_source_heading?: unknown }[];
      };
      headings = new Map(
        (parsed.activities ?? []).flatMap((entry) =>
          typeof entry.activity_id === 'string' && typeof entry.feedback_source_heading === 'string'
            ? [[entry.activity_id, entry.feedback_source_heading] as const]
            : [],
        ),
      );
    }
    return headings.get(activityId);
  };

  return (activity) => {
    if (answers.has(activity.activityId)) return answers.get(activity.activityId) ?? null;
    const heading = headingOf(activity.activityId);
    const lesson = heading ? loadLesson(db, releaseRowId, activity.lessonId) : undefined;
    const answer = lesson ? workedAnswerSection(lesson.sourceText, heading) : null;
    answers.set(activity.activityId, answer);
    return answer;
  };
}
