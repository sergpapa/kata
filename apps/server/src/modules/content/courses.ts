import type { Db } from '../lifecycle/database.js';
import { parseActivitySet } from './activitySet.js';
import { saveRelease } from './repository.js';
import type { CourseConfig, CourseState, ImportFailure, VerifiedRelease } from './types.js';
import { verifyRelease } from './verify.js';

/**
 * Imports every configured course, in config order, each from its own release (ADR 0018).
 *
 * Each release is proven on its own, so one refusal refuses one course and never the app. Two
 * further checks belong to a course rather than to a release, and so live here rather than in
 * `verifyRelease`: the release must name this course, and its IDs must not mean something else in
 * a course already imported. Learner work is keyed by activity ID, so an activity ID reused for a
 * different lesson would quietly put two different answers into one record. Both checks run
 * before anything of the course is stored.
 *
 * Only imported courses claim IDs. A refused course stored nothing, so a later course reusing its
 * IDs contradicts nothing the app serves.
 */
export function importCourses(db: Db, configs: readonly CourseConfig[]): CourseState[] {
  const lessonOwners = new Map<string, { documentId: string; courseId: string }>();
  const activityOwners = new Map<string, { lessonId: string; courseId: string }>();

  return configs.map((config): CourseState => {
    const outcome = verifyRelease(config.releaseDir);
    if (outcome.state === 'failed') {
      return { ...config, release: { state: 'failed', failure: outcome.failure } };
    }

    const refusal =
      courseMismatch(config.courseId, outcome.release) ??
      lessonCollision(config.courseId, outcome.release, lessonOwners) ??
      activityCollision(config.courseId, outcome.release, activityOwners);
    if (refusal) return { ...config, release: { state: 'failed', failure: refusal } };

    const releaseRowId = saveRelease(db, outcome.release);
    for (const lesson of outcome.release.lessons) {
      lessonOwners.set(lesson.candidateLessonId, {
        documentId: lesson.documentId,
        courseId: config.courseId,
      });
    }
    for (const activity of activitiesOf(outcome.release)) {
      activityOwners.set(activity.activityId, {
        lessonId: activity.lessonId,
        courseId: config.courseId,
      });
    }
    return { ...config, release: { state: 'imported', releaseRowId } };
  });
}

function courseMismatch(courseId: string, release: VerifiedRelease): ImportFailure | undefined {
  // The dash is part of the prefix: `QAXTRA-RELEASE` is another course's, not course QAX's.
  if (release.releaseId.startsWith(`${courseId}-`)) return undefined;
  return {
    code: 'release_course_mismatch',
    message: `Course ${courseId} is configured with release ${release.releaseId}, which belongs to another course: a release for course ${courseId} has an ID starting "${courseId}-".`,
    file: null,
  };
}

function lessonCollision(
  courseId: string,
  release: VerifiedRelease,
  owners: ReadonlyMap<string, { documentId: string; courseId: string }>,
): ImportFailure | undefined {
  for (const lesson of release.lessons) {
    const earlier = owners.get(lesson.candidateLessonId);
    if (earlier && earlier.documentId !== lesson.documentId) {
      return {
        code: 'lesson_id_collision',
        message: `Lesson ${lesson.candidateLessonId} is document ${lesson.documentId} in course ${courseId}, but course ${earlier.courseId} already uses that lesson ID for document ${earlier.documentId}. A shared lesson keeps one ID and one document.`,
        file: lesson.sourcePath,
      };
    }
  }
  return undefined;
}

function activityCollision(
  courseId: string,
  release: VerifiedRelease,
  owners: ReadonlyMap<string, { lessonId: string; courseId: string }>,
): ImportFailure | undefined {
  for (const activity of activitiesOf(release)) {
    const earlier = owners.get(activity.activityId);
    if (earlier && earlier.lessonId !== activity.lessonId) {
      return {
        code: 'activity_id_collision',
        message: `Activity ${activity.activityId} belongs to lesson ${activity.lessonId} in course ${courseId}, but course ${earlier.courseId} already uses that activity ID for lesson ${earlier.lessonId}. Answers are kept by activity ID, so one ID cannot mean two activities.`,
        file: release.activitySet.sourcePath,
      };
    }
  }
  return undefined;
}

/** The release's activities. `verifyRelease` already refused any set that does not parse. */
function activitiesOf(release: VerifiedRelease) {
  const parsed = parseActivitySet(release.activitySet.sourceText);
  if (!parsed.ok) {
    throw new Error(
      `Release ${release.releaseId} was verified with an activity set that does not parse (${parsed.detail}).`,
    );
  }
  return parsed.activities;
}
