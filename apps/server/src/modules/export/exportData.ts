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
import { currentConversation } from '../feedback/feedbackRepository.js';
import type { FeedbackTurnForPage } from '../feedback/types.js';

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
}

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
  readonly conversations: boolean;
}

function revisionsByField(revisions: readonly StoredRevision[]): Map<string, StoredRevision[]> {
  const byField = new Map<string, StoredRevision[]>();
  for (const revision of revisions) {
    const key = `${revision.activityId}\u0000${revision.fieldName}`;
    const list = byField.get(key) ?? [];
    list.push(revision);
    byField.set(key, list);
  }
  return byField;
}

/**
 * Reads the range's lessons, their activities' answers and history, the dropped work, and — only
 * when asked — the current conversations. The caller runs it inside one transaction.
 *
 * `from` and `to` are positions in `release.lessons`, already validated by the caller.
 */
export function readExport(
  db: Db,
  input: {
    readonly release: StoredReleaseSummary;
    readonly activities: readonly LessonActivity[];
    readonly fromIndex: number;
    readonly toIndex: number;
    readonly conversations: boolean;
  },
): ExportContent {
  const { release, activities } = input;
  const lessons = release.lessons.slice(input.fromIndex, input.toIndex + 1);
  const lessonIds = lessons.map((lesson) => lesson.candidateLessonId);
  const inRange = activities.filter((activity) => lessonIds.includes(activity.lessonId));
  const listed = new Set(activities.map((activity) => activity.activityId));

  const live = loadResponsesForActivities(
    db,
    inRange.map((activity) => activity.activityId),
  );
  const liveByField = new Map(live.map((one) => [`${one.activityId}\u0000${one.fieldName}`, one]));

  const droppedLive = loadResponsesForLessons(db, lessonIds).filter(
    (one) => !listed.has(one.activityId),
  );
  const droppedIds = [...new Set(droppedLive.map((one) => one.activityId))];

  const earlier = revisionsByField(
    loadEarlierRevisions(db, [...inRange.map((activity) => activity.activityId), ...droppedIds]),
  );
  const fieldOf = (activityId: string, fieldName: string, current?: StoredResponse) => ({
    fieldName,
    ...(current ? { current } : {}),
    earlier: earlier.get(`${activityId}\u0000${fieldName}`) ?? [],
  });

  const exportedLessons: ExportedLesson[] = lessons.map((lesson) => ({
    lesson,
    activities: inRange
      .filter((activity) => activity.lessonId === lesson.candidateLessonId)
      .map((activity) => {
        const turns = input.conversations
          ? currentConversation(db, activity.activityId)?.turns
          : undefined;
        return {
          activity,
          fields: activity.responseFields.map((fieldName) =>
            fieldOf(
              activity.activityId,
              fieldName,
              liveByField.get(`${activity.activityId}\u0000${fieldName}`),
            ),
          ),
          ...(turns && turns.length > 0 ? { turns } : {}),
        };
      }),
  }));

  // Lesson order, then activity id: the release no longer says where these sat in a lesson.
  const dropped: DroppedActivity[] = lessons.flatMap((lesson) =>
    droppedIds
      .filter((activityId) =>
        droppedLive.some(
          (one) =>
            one.activityId === activityId && one.candidateLessonId === lesson.candidateLessonId,
        ),
      )
      .map((activityId) => ({
        activityId,
        candidateLessonId: lesson.candidateLessonId,
        fields: droppedLive
          .filter(
            (one) =>
              one.activityId === activityId && one.candidateLessonId === lesson.candidateLessonId,
          )
          .map((one) => fieldOf(activityId, one.fieldName, one)),
      })),
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
