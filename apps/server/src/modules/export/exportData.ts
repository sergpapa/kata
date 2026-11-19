import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import type { StoredLessonSummary, StoredReleaseSummary } from '../content/types.js';
import {
  loadEarlierRevisions,
  loadResponsesForActivities,
  loadResponsesForLessons,
  type StoredResponse,
  type StoredRevision,
} from '../learner/responseRepository.js';
import { currentConversation, earlierConversations } from '../feedback/feedbackRepository.js';
import type { EarlierConversationForPage, FeedbackTurnForPage } from '../feedback/types.js';

/**
 * Everything one export file says, read from the store (docs/specs/export.md, ADR 0020).
 *
 * Kept apart from the Markdown so the reading can be one synchronous transaction (EX12) and the
 * writing can be a pure function of what was read.
 */

export interface ExportedField {
  readonly fieldName: string;
  /** Absent when the field was never answered. */
  readonly current?: StoredResponse;
  /** Newest first, excluding the current text (ADR 0012). */
  readonly earlier: readonly StoredRevision[];
}

export interface ExportedActivity {
  readonly activity: LessonActivity;
  readonly fields: readonly ExportedField[];
  /** The current conversation's turns; absent when none was asked for or none is current. */
  readonly turns?: readonly FeedbackTurnForPage[];
  /** Newest first; only with `all`, and absent when there are none (earlier-conversations EC11). */
  readonly earlier?: readonly EarlierConversationForPage[];
}

/** Which of Claude's conversations go with the file: the `conversations` parameter, read. */
export type ConversationsChoice = 'none' | 'current' | 'all';

export interface ExportedLesson {
  readonly lesson: StoredLessonSummary;
  readonly activities: readonly ExportedActivity[];
}

/** Work whose activity the release no longer lists (EX8). */
export interface DroppedActivity {
  readonly activityId: string;
  readonly candidateLessonId: string;
  readonly fields: readonly ExportedField[];
}

export interface ExportContent {
  readonly release: StoredReleaseSummary;
  readonly from: StoredLessonSummary;
  readonly to: StoredLessonSummary;
  readonly lessons: readonly ExportedLesson[];
  readonly dropped: readonly DroppedActivity[];
  readonly conversations: ConversationsChoice;
}

/** One field of one activity as a map key. NUL occurs in neither id, so no two keys collide. */
function fieldKey(activityId: string, fieldName: string): string {
  return `${activityId}\u0000${fieldName}`;
}

function revisionsByField(revisions: readonly StoredRevision[]): Map<string, StoredRevision[]> {
  const byField = new Map<string, StoredRevision[]>();
  for (const revision of revisions) {
    const key = fieldKey(revision.activityId, revision.fieldName);
    const list = byField.get(key) ?? [];
    list.push(revision);
    byField.set(key, list);
  }
  return byField;
}

/**
 * Reads the range's lessons, their activities' answers and history, the dropped work, and — only
 * when asked — the current conversations, and with `all` the earlier ones. The caller runs it inside one transaction.
 *
 * `from` and `to` are positions in `release.lessons`, already validated by the caller.
 */
export function readExport(
  db: Db,
  input: {
    /** Rows whose release id does not start with `<courseId>-` belong to another course. */
    readonly courseId: string;
    readonly release: StoredReleaseSummary;
    readonly activities: readonly LessonActivity[];
    readonly fromIndex: number;
    readonly toIndex: number;
    readonly conversations: ConversationsChoice;
  },
): ExportContent {
  const { release, activities } = input;
  const lessons = release.lessons.slice(input.fromIndex, input.toIndex + 1);
  const lessonIds = lessons.map((lesson) => lesson.candidateLessonId);
  const inRange = activities.filter((activity) => lessonIds.includes(activity.lessonId));
  const listed = new Map(activities.map((activity) => [activity.activityId, activity]));

  const live = loadResponsesForActivities(
    db,
    inRange.map((activity) => activity.activityId),
  );
  const liveByField = new Map(live.map((one) => [fieldKey(one.activityId, one.fieldName), one]));

  // Work the release no longer shows (EX8): a row of this course whose activity is gone, or whose
  // field its activity no longer declares. A still-listed activity is placed by the lesson it sits
  // in now; a gone one only by the lesson its last save was stamped with.
  const shown = (one: StoredResponse) =>
    listed.get(one.activityId)?.responseFields.includes(one.fieldName) === true;
  const lessonOfDropped = (one: StoredResponse) =>
    listed.get(one.activityId)?.lessonId ?? one.candidateLessonId;
  const candidates = new Map(
    [...loadResponsesForLessons(db, lessonIds), ...live].map((one) => [
      fieldKey(one.activityId, one.fieldName),
      one,
    ]),
  );
  const droppedLive = [...candidates.values()].filter(
    (one) =>
      one.releaseId.startsWith(`${input.courseId}-`) &&
      !shown(one) &&
      lessonIds.includes(lessonOfDropped(one)),
  );
  const droppedIds = [...new Set(droppedLive.map((one) => one.activityId))].sort();

  const earlier = revisionsByField(
    loadEarlierRevisions(db, [...inRange.map((activity) => activity.activityId), ...droppedIds]),
  );
  const fieldOf = (activityId: string, fieldName: string, current?: StoredResponse) => ({
    fieldName,
    ...(current ? { current } : {}),
    earlier: earlier.get(fieldKey(activityId, fieldName)) ?? [],
  });

  const exportedLessons: ExportedLesson[] = lessons.map((lesson) => ({
    lesson,
    activities: inRange
      .filter((activity) => activity.lessonId === lesson.candidateLessonId)
      .map((activity) => {
        const turns =
          input.conversations === 'none'
            ? undefined
            : currentConversation(db, activity.activityId)?.turns;
        const earlier =
          input.conversations === 'all' ? earlierConversations(db, activity.activityId) : [];
        return {
          activity,
          fields: activity.responseFields.map((fieldName) =>
            fieldOf(
              activity.activityId,
              fieldName,
              liveByField.get(fieldKey(activity.activityId, fieldName)),
            ),
          ),
          ...(turns && turns.length > 0 ? { turns } : {}),
          ...(earlier.length > 0 ? { earlier } : {}),
        };
      }),
  }));

  // Lesson order, then activity id: the release no longer says where these sat in a lesson.
  const dropped: DroppedActivity[] = lessons.flatMap((lesson) =>
    droppedIds.flatMap((activityId) => {
      const rows = droppedLive.filter(
        (one) => one.activityId === activityId && lessonOfDropped(one) === lesson.candidateLessonId,
      );
      return rows.length === 0
        ? []
        : [
            {
              activityId,
              candidateLessonId: lesson.candidateLessonId,
              fields: rows.map((one) => fieldOf(activityId, one.fieldName, one)),
            },
          ];
    }),
  );

  return {
    release,
    from: lessons[0] as StoredLessonSummary,
    to: lessons[lessons.length - 1] as StoredLessonSummary,
    lessons: exportedLessons,
    dropped,
    conversations: input.conversations,
  };
}
