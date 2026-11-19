import type { FastifyInstance } from 'fastify';
import type { Db } from '../lifecycle/database.js';
import {
  lessonExists,
  loadActivitySetText,
  loadLabKit,
  loadLesson,
  loadNeighbours,
  loadReleaseSummary,
} from './repository.js';
import { registerLabRoutes } from './labRoutes.js';
import { activitiesForLesson, parseActivitySet, type LessonActivity } from './activitySet.js';
import { learnerFacingFacts, lessonBodyBelowTitle } from './lessonView.js';
import { loadResumePoint, saveResumePoint } from '../learner/resumeRepository.js';
import { loadEarlierRevisions, loadResponsesForActivities } from '../learner/responseRepository.js';
import { registerResponseRoutes, responseWithHistory } from '../learner/responseRoutes.js';
import type { CourseState } from './types.js';
import type { FeedbackDeps } from '../feedback/types.js';
import {
  lessonFeedback,
  registerFeedbackRoutes,
  type FeedbackRouteDeps,
} from '../feedback/feedbackRoutes.js';
import { workedAnswerLookup } from '../feedback/lessonAnswers.js';

/**
 * Everything one course serves, under `/api/courses/<courseId>/` (ADR 0018).
 *
 * Moved out of `app.ts` unchanged in behaviour when the app began serving more than one course:
 * each course registers this once, with its own release, so no handler here can reach another
 * course's lessons, kits or resume point. A refused release is each endpoint's answer, not its
 * failure — the same shape the one-course app used.
 */
export function registerCourseRoutes(
  app: FastifyInstance,
  db: Db,
  course: CourseState,
  feedback: FeedbackDeps,
): void {
  const { release } = course;

  /**
   * The parsed activity set, kept per release row. The rows are append-only and a release row never
   * changes once written (ADR 0006), so a parse of its stored bytes cannot go stale.
   */
  let parsedActivities: readonly LessonActivity[] | undefined;

  /**
   * This course's activities, derived from the release's stored activity file. Throws rather than
   * answering an empty list if the stored text no longer parses: the import refuses an unreadable
   * set by name, so reaching here means the record store was changed under a running process.
   */
  function allActivities(): readonly LessonActivity[] {
    if (release.state === 'failed') return [];
    if (parsedActivities) return parsedActivities;

    const sourceText = loadActivitySetText(db, release.releaseRowId);
    if (sourceText === undefined) {
      throw new Error(
        `Release row ${release.releaseRowId} has no stored activity set, and every imported release stores one.`,
      );
    }
    const parsed = parseActivitySet(sourceText);
    if (!parsed.ok) {
      throw new Error(
        `The stored activity set no longer reads as one (${parsed.detail}). It was verified at import, so the record store has changed since.`,
      );
    }
    parsedActivities = parsed.activities;
    return parsed.activities;
  }

  /** The version and release a write against this lesson is recorded under (ADR 0011). */
  function provenanceOf(candidateLessonId: string) {
    if (release.state === 'failed') return undefined;
    // One read of the release summary, not one per field of it: it loads every lesson row.
    const summary = loadReleaseSummary(db, release.releaseRowId);
    const lesson = summary?.lessons.find((one) => one.candidateLessonId === candidateLessonId);
    if (!summary || !lesson) return undefined;
    return { contentVersion: lesson.contentVersion, releaseId: summary.releaseId };
  }

  const feedbackDeps: FeedbackRouteDeps = {
    db,
    release,
    feedback,
    activitiesOfRelease: allActivities,
    workedAnswerOf:
      release.state === 'failed' ? () => null : workedAnswerLookup(db, release.releaseRowId),
    provenanceOf,
  };

  function summaryOf(releaseRowId: number) {
    const summary = loadReleaseSummary(db, releaseRowId);
    if (!summary) {
      throw new Error(
        `The import reported release row ${releaseRowId}, and the record store has no such row.`,
      );
    }
    return summary;
  }

  app.get('/release', async () => {
    if (release.state === 'failed') return { state: 'failed', failure: release.failure };
    const { lessons, ...releaseSummary } = summaryOf(release.releaseRowId);
    return {
      state: 'imported',
      // Named here so a page can say which course it is in without asking a second question.
      course: { courseId: course.courseId, title: course.title },
      release: releaseSummary,
      lessons,
    };
  });

  /**
   * One lesson to read. The body is derived on the way out — the stored Markdown stays canonical,
   * so changing how a lesson is presented never requires re-importing it (ADR 0005).
   */
  app.get<{ Params: { candidateLessonId: string } }>(
    '/lessons/:candidateLessonId',
    async (request, reply) => {
      if (release.state === 'failed') return { state: 'failed', failure: release.failure };

      const { candidateLessonId } = request.params;
      const stored = loadLesson(db, release.releaseRowId, candidateLessonId);
      if (!stored) {
        return reply.code(404).send({
          error: 'lesson_not_found',
          message: `This release has no lesson ${candidateLessonId}.`,
        });
      }
      const summary = summaryOf(release.releaseRowId);

      const { frontMatter, sourceText, ...identity } = stored;
      const activities = activitiesForLesson(allActivities(), candidateLessonId);
      return {
        state: 'lesson',
        release: { releaseId: summary.releaseId, version: summary.version },
        lesson: {
          ...identity,
          facts: learnerFacingFacts(frontMatter),
          bodyMarkdown: lessonBodyBelowTitle(sourceText),
        },
        activities,
        // The learner's own work rides on the answer the page is already waiting for, each field
        // with its superseded answers (docs/specs/acknowledged-saves.md F2, prediction-history A10).
        responses: lessonResponses(db, activities),
        // Each activity's feedback area, and whether a turn can start (practice-feedback PF8).
        feedback: lessonFeedback(feedbackDeps, activities),
        // The kit the manifest declares for this lesson, which is what the download route serves.
        labKit: stored.labId
          ? (labKitForPage(db, release.releaseRowId, stored.labId) ?? null)
          : null,
        ...loadNeighbours(db, release.releaseRowId, stored.order),
      };
    },
  );

  /**
   * The lesson last opened in this course — a silent pointer, not learner work (ADR 0010). It
   * answers `none` rather than naming a lesson this course's release does not carry.
   */
  app.get('/resume-point', async () => {
    if (release.state === 'failed') return { state: 'failed', failure: release.failure };
    const stored = loadResumePoint(db, course.courseId);
    if (!stored || !lessonExists(db, release.releaseRowId, stored.candidateLessonId)) {
      return { state: 'none' };
    }
    return { state: 'set', ...stored };
  });

  app.put<{ Body: unknown }>('/resume-point', async (request, reply) => {
    if (release.state === 'failed') return { state: 'failed', failure: release.failure };

    const body = request.body as { candidateLessonId?: unknown } | null;
    const candidateLessonId = body?.candidateLessonId;
    if (typeof candidateLessonId !== 'string' || candidateLessonId === '') {
      return reply.code(400).send({
        error: 'resume_point_invalid',
        message: 'A resume point names one lesson: a non-empty string candidateLessonId.',
      });
    }
    if (!lessonExists(db, release.releaseRowId, candidateLessonId)) {
      return reply.code(404).send({
        error: 'lesson_not_found',
        message: `This release has no lesson ${candidateLessonId}.`,
      });
    }

    const recordedAt = new Date().toISOString();
    saveResumePoint(db, course.courseId, candidateLessonId, recordedAt);
    return { state: 'set', candidateLessonId, recordedAt };
  });

  registerLabRoutes(app, { db, release, releaseDir: course.releaseDir });

  registerResponseRoutes(app, {
    db,
    release,
    activitiesOfRelease: allActivities,
    provenanceOf,
    now: () => new Date().toISOString(),
  });

  registerFeedbackRoutes(app, feedbackDeps);
}

/**
 * A kit as the lesson page needs it. `sourcePath` is dropped on the way out: the page addresses a
 * kit by its lab id, and where the file sits inside the release is the app's business.
 */
function labKitForPage(db: Db, releaseRowId: number, labId: string) {
  const kit = loadLabKit(db, releaseRowId, labId);
  if (!kit) return undefined;
  const { sourcePath: _sourcePath, ...forPage } = kit;
  return forPage;
}

/** One lesson's stored fields, each carrying the revisions it has superseded (ADR 0012). */
function lessonResponses(db: Db, activities: readonly LessonActivity[]) {
  const activityIds = activities.map((activity) => activity.activityId);
  const earlier = loadEarlierRevisions(db, activityIds);
  return loadResponsesForActivities(db, activityIds).map((stored) =>
    responseWithHistory(stored, earlier),
  );
}
