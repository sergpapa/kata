import type { FastifyInstance } from 'fastify';
import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import type { ReleaseState } from '../content/types.js';
import type { FeedbackAvailability, FeedbackDeps, FeedbackForPage } from './types.js';

export interface FeedbackRouteDeps {
  readonly db: Db;
  readonly release: ReleaseState;
  readonly feedback: FeedbackDeps;
  readonly activitiesOfRelease: () => readonly LessonActivity[];
  /** The stored Markdown of a lesson in this release, for the worked-answer section. */
  readonly lessonSourceOf: (candidateLessonId: string) => string | undefined;
  readonly provenanceOf: (
    candidateLessonId: string,
  ) => { readonly contentVersion: string; readonly releaseId: string } | undefined;
}

/** The feedback routes under a course's prefix (docs/specs/practice-feedback.md). */
export function registerFeedbackRoutes(app: FastifyInstance, deps: FeedbackRouteDeps): void {
  void app;
  void deps;
}

/** What the lesson answer carries for its activities' feedback areas (PF8). */
export function lessonFeedback(
  deps: FeedbackRouteDeps,
  activities: readonly LessonActivity[],
): {
  readonly availability: FeedbackAvailability;
  readonly activities: readonly FeedbackForPage[];
} {
  void deps;
  void activities;
  throw new Error('not implemented');
}
