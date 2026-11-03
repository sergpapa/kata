import type { Db } from '../lifecycle/database.js';
import { parseActivitySet, type LessonActivity } from './activitySet.js';
import { saveRelease } from './repository.js';
import { loadStoredReleaseIdentities } from './storedReleases.js';
import type { CourseConfig, CourseState, ImportFailure, VerifiedRelease } from './types.js';
import { verifyRelease } from './verify.js';

/**
 * Imports every configured course, in config order, each from its own release (ADR 0018).
 *
 * Each release is proven on its own, so one refusal refuses one course and never the app. Two
 * further checks belong to a course rather than to a release, and so live here rather than in
 * `verifyRelease`: the release must name this course, and its IDs must not mean something else in
 * another course. Learner work is keyed by activity ID, so an activity ID reused for a different
 * lesson would quietly put two different answers into one record. Both checks run before anything
 * of the course is stored.
 *
 * "Another course" means every release of another course ever stored, not only those imported on
 * this start: a course refused today may hold answers from yesterday under its IDs, and whether a
 * reuse is caught must not depend on which course happened to be refused at startup. A course's
 * own earlier releases are not held against it; how a course revises itself is the corrections
 * process's business (ADR 0011).
 *
 * Throws on a course list that is itself wrong — a repeated id, or one that is unsafe in an
 * address. That is a defect in `config.ts`, not in content, and starting anyway would register
 * routes no request can reach.
 */
export function importCourses(db: Db, configs: readonly CourseConfig[]): CourseState[] {
  assertUsableCourseIds(configs);

  const owners = claimsOfStoredReleases(db, configs);

  return configs.map((config): CourseState => {
    const outcome = verifyRelease(config.releaseDir);
    if (outcome.state === 'failed') {
      return { ...config, release: { state: 'failed', failure: outcome.failure } };
    }
    const activities = activitiesOf(outcome.release);

    const refusal =
      courseMismatch(config.courseId, outcome.release) ??
      lessonCollision(config.courseId, outcome.release, owners) ??
      activityCollision(config.courseId, outcome.release, activities, owners);
    if (refusal) return { ...config, release: { state: 'failed', failure: refusal } };

    const releaseRowId = saveRelease(db, outcome.release);
    claim(owners, config.courseId, outcome.release.lessons, activities);
    return { ...config, release: { state: 'imported', releaseRowId } };
  });
}

/** Letters, digits, `_` and `-`: what a course id can be and still sit unescaped in an address. */
const USABLE_COURSE_ID = /^[A-Za-z0-9_-]+$/;

function assertUsableCourseIds(configs: readonly CourseConfig[]): void {
  const seen = new Set<string>();
  for (const { courseId } of configs) {
    if (!USABLE_COURSE_ID.test(courseId)) {
      throw new Error(
        `Course id "${courseId}" in config.ts cannot be used in an address: use letters, digits, _ and - only.`,
      );
    }
    if (seen.has(courseId)) {
      throw new Error(
        `Course id "${courseId}" appears twice in config.ts; each course needs its own.`,
      );
    }
    seen.add(courseId);
  }
}

interface Owners {
  readonly lessons: Map<string, { documentId: string; courseId: string }>;
  readonly activities: Map<string, { lessonId: string; courseId: string }>;
}

/**
 * What every stored release of a configured course has said its IDs mean. A release is a course's
 * by its `release_id` prefix (C3); a stored release naming no configured course claims nothing.
 */
function claimsOfStoredReleases(db: Db, configs: readonly CourseConfig[]): Owners {
  const owners: Owners = { lessons: new Map(), activities: new Map() };
  for (const stored of loadStoredReleaseIdentities(db)) {
    const course = configs.find(({ courseId }) => stored.releaseId.startsWith(`${courseId}-`));
    if (!course) continue;
    const parsed =
      stored.activitySetText === undefined ? undefined : parseActivitySet(stored.activitySetText);
    const activities = parsed?.ok ? parsed.activities : [];
    claim(owners, course.courseId, stored.lessons, activities);
  }
  return owners;
}

function claim(
  owners: Owners,
  courseId: string,
  lessons: readonly { readonly candidateLessonId: string; readonly documentId: string }[],
  activities: readonly LessonActivity[],
): void {
  for (const lesson of lessons) {
    owners.lessons.set(lesson.candidateLessonId, { documentId: lesson.documentId, courseId });
  }
  for (const activity of activities) {
    owners.activities.set(activity.activityId, { lessonId: activity.lessonId, courseId });
  }
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
  owners: Owners,
): ImportFailure | undefined {
  for (const lesson of release.lessons) {
    const earlier = owners.lessons.get(lesson.candidateLessonId);
    if (earlier && earlier.courseId !== courseId && earlier.documentId !== lesson.documentId) {
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
  activities: readonly LessonActivity[],
  owners: Owners,
): ImportFailure | undefined {
  for (const activity of activities) {
    const earlier = owners.activities.get(activity.activityId);
    if (earlier && earlier.courseId !== courseId && earlier.lessonId !== activity.lessonId) {
      return {
        code: 'activity_id_collision',
        message: `Activity ${activity.activityId} belongs to lesson ${activity.lessonId} in course ${courseId}, but course ${earlier.courseId} already uses that activity ID for lesson ${earlier.lessonId}. Answers are kept by activity ID, so one ID cannot mean two activities.`,
        file: release.activitySet.sourcePath,
      };
    }
  }
  return undefined;
}

/** The release's activities, read once. `verifyRelease` already refused any set that won't parse. */
function activitiesOf(release: VerifiedRelease): readonly LessonActivity[] {
  const parsed = parseActivitySet(release.activitySet.sourceText);
  if (!parsed.ok) {
    throw new Error(
      `Release ${release.releaseId} was verified with an activity set that does not parse (${parsed.detail}).`,
    );
  }
  return parsed.activities;
}
