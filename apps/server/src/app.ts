import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import type { Db } from './modules/lifecycle/database.js';
import { readSchemaVersion } from './modules/lifecycle/database.js';
import {
  lessonExists,
  loadActivitySetText,
  loadLesson,
  loadNeighbours,
  loadReleaseSummary,
} from './modules/content/repository.js';
import {
  activitiesForLesson,
  parseActivitySet,
  type LessonActivity,
} from './modules/content/activitySet.js';
import { learnerFacingFacts, lessonBodyBelowTitle } from './modules/content/lessonView.js';
import { loadResumePoint, saveResumePoint } from './modules/learner/resumeRepository.js';
import { loadResponsesForActivities } from './modules/learner/responseRepository.js';
import { registerResponseRoutes, responseForPage } from './modules/learner/responseRoutes.js';
import type { ReleaseState } from './modules/content/types.js';

export interface AppDeps {
  readonly db: Db;
  /** The outcome of the import this process started with. A refusal is served, not hidden. */
  readonly release: ReleaseState;
  /** Built client directory. Omitted in tests and in development, where Vite serves the client. */
  readonly webDistDir?: string;
}

/**
 * Builds the HTTP application without binding a port, so tests drive it through `app.inject`.
 * Dependencies are required rather than defaulted: a default would let an unwired composition
 * start and fail at runtime instead of at the type level.
 */
/**
 * One lesson's activities, derived from the release's stored activity file.
 *
 * Throws rather than answering an empty list if the stored text no longer parses: the import
 * refuses an unreadable set by name, so reaching here means the record store was changed under a
 * running process, and a lesson that silently lost its activities would look identical to a lesson
 * that never had any.
 */
/**
 * The parsed activity set, kept per release row.
 *
 * The rows are append-only and a release row never changes once written (ADR 0006), so a parse of
 * its stored bytes cannot go stale. Without this, every lesson view and every save re-read and
 * re-parsed all 45 activities — twelve saves on one lesson was twelve full parses.
 */
const parsedActivitySets = new WeakMap<Db, Map<number, readonly LessonActivity[]>>();

function allActivities(deps: AppDeps): readonly LessonActivity[] {
  if (deps.release.state === 'failed') return [];

  const forDb = parsedActivitySets.get(deps.db) ?? new Map<number, readonly LessonActivity[]>();
  parsedActivitySets.set(deps.db, forDb);
  const already = forDb.get(deps.release.releaseRowId);
  if (already) return already;

  const sourceText = loadActivitySetText(deps.db, deps.release.releaseRowId);
  if (sourceText === undefined) {
    throw new Error(
      `Release row ${deps.release.releaseRowId} has no stored activity set, and every imported release stores one.`,
    );
  }

  const parsed = parseActivitySet(sourceText);
  if (!parsed.ok) {
    throw new Error(
      `The stored activity set no longer reads as one (${parsed.detail}). It was verified at import, so the record store has changed since.`,
    );
  }

  forDb.set(deps.release.releaseRowId, parsed.activities);
  return parsed.activities;
}

function activitiesOf(deps: AppDeps, candidateLessonId: string) {
  return activitiesForLesson(allActivities(deps), candidateLessonId);
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: false,
    // Above the 100,000 characters a response may hold, so the refusal the reader meets is this
    // app's own — naming the limit and the length it got — rather than Fastify's generic 413.
    // A UTF-8 character can take four bytes and JSON escaping can double it again, so the ceiling
    // is set well clear of the limit it exists to let through to the handler.
    bodyLimit: 4 * 1024 * 1024,
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    schemaVersion: readSchemaVersion(deps.db),
  }));

  /**
   * Answers 200 either way. A refused release is this endpoint's answer, not its failure — a 5xx
   * would have the page report a broken app when the app is fine and the content is not.
   */
  app.get('/api/release', async () => {
    if (deps.release.state === 'failed') {
      return { state: 'failed', failure: deps.release.failure };
    }
    const summary = loadReleaseSummary(deps.db, deps.release.releaseRowId);
    if (!summary) {
      throw new Error(
        `The import reported release row ${deps.release.releaseRowId}, and the record store has no such row.`,
      );
    }
    const { lessons, ...release } = summary;
    return { state: 'imported', release, lessons };
  });

  /**
   * One lesson to read. The body is derived on the way out — the stored Markdown stays canonical,
   * so changing how a lesson is presented never requires re-importing it (ADR 0005).
   */
  app.get<{ Params: { candidateLessonId: string } }>(
    '/api/lessons/:candidateLessonId',
    async (request, reply) => {
      if (deps.release.state === 'failed') {
        return { state: 'failed', failure: deps.release.failure };
      }

      const { candidateLessonId } = request.params;
      const stored = loadLesson(deps.db, deps.release.releaseRowId, candidateLessonId);
      if (!stored) {
        return reply.code(404).send({
          error: 'lesson_not_found',
          message: `This release has no lesson ${candidateLessonId}.`,
        });
      }

      const summary = loadReleaseSummary(deps.db, deps.release.releaseRowId);
      if (!summary) {
        throw new Error(
          `The import reported release row ${deps.release.releaseRowId}, and the record store has no such row.`,
        );
      }

      const { frontMatter, sourceText, ...identity } = stored;
      const activities = activitiesOf(deps, candidateLessonId);
      return {
        state: 'lesson',
        release: { releaseId: summary.releaseId, version: summary.version },
        lesson: {
          ...identity,
          facts: learnerFacingFacts(frontMatter),
          bodyMarkdown: lessonBodyBelowTitle(sourceText),
        },
        // The author's own placement instructions for this lesson. The import refused any set that
        // could not be read, so a failure here means the stored row was changed underneath a
        // running app — said out loud rather than served as a lesson that quietly lost its
        // activities.
        activities,
        // The learner's own work for this lesson's activities, carried on the answer the page is
        // already waiting for. A second request would draw every box empty and fill it a moment
        // later, which reads as work lost and recovered (docs/specs/acknowledged-saves.md F2).
        responses: loadResponsesForActivities(
          deps.db,
          activities.map((activity) => activity.activityId),
        ).map(responseForPage),
        // Manifest order, answered by the side that stores it, so previous/next can never disagree
        // with the list the dashboard shows.
        ...loadNeighbours(deps.db, deps.release.releaseRowId, stored.order),
      };
    },
  );

  /**
   * The lesson last opened — a silent pointer, not learner work (ADR 0010). It answers `none`
   * rather than a record naming a lesson the imported release does not carry: the row stays, the
   * app just refuses to offer a link the release cannot honour.
   */
  app.get('/api/resume-point', async () => {
    if (deps.release.state === 'failed') {
      return { state: 'failed', failure: deps.release.failure };
    }
    const stored = loadResumePoint(deps.db);
    if (!stored || !lessonExists(deps.db, deps.release.releaseRowId, stored.candidateLessonId)) {
      return { state: 'none' };
    }
    return { state: 'set', ...stored };
  });

  app.put<{ Body: unknown }>('/api/resume-point', async (request, reply) => {
    if (deps.release.state === 'failed') {
      return { state: 'failed', failure: deps.release.failure };
    }

    const body = request.body as { candidateLessonId?: unknown } | null;
    const candidateLessonId = body?.candidateLessonId;
    if (typeof candidateLessonId !== 'string' || candidateLessonId === '') {
      return reply.code(400).send({
        error: 'resume_point_invalid',
        message: 'A resume point names one lesson: a non-empty string candidateLessonId.',
      });
    }

    if (!lessonExists(deps.db, deps.release.releaseRowId, candidateLessonId)) {
      return reply.code(404).send({
        error: 'lesson_not_found',
        message: `This release has no lesson ${candidateLessonId}.`,
      });
    }

    const recordedAt = new Date().toISOString();
    saveResumePoint(deps.db, candidateLessonId, recordedAt);
    return { state: 'set', candidateLessonId, recordedAt };
  });

  registerResponseRoutes(app, {
    db: deps.db,
    release: deps.release,
    activitiesOfRelease: () => allActivities(deps),
    // One read of the release summary, not one per field of it: it loads every lesson row, and a
    // save asked for two fields of the same object moments apart.
    provenanceOf: (candidateLessonId) => {
      if (deps.release.state === 'failed') return undefined;
      const summary = loadReleaseSummary(deps.db, deps.release.releaseRowId);
      const lesson = summary?.lessons.find((one) => one.candidateLessonId === candidateLessonId);
      if (!summary || !lesson) return undefined;
      return { contentVersion: lesson.contentVersion, releaseId: summary.releaseId };
    },
    now: () => new Date().toISOString(),
  });

  if (deps.webDistDir && fs.existsSync(deps.webDistDir)) {
    void app.register(fastifyStatic, { root: deps.webDistDir });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'not_found', message: `No route for ${request.url}` });
      }
      return reply.sendFile('index.html');
    });
  } else if (deps.webDistDir) {
    // Configured but not built. Saying so beats Fastify's bare "Route GET:/ not found", which reads
    // like a broken app rather than a missing build step.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'not_found', message: `No route for ${request.url}` });
      }
      return reply
        .code(503)
        .type('text/plain; charset=utf-8')
        .send(
          `The client has not been built, so there is no page to show.\nRun: npm run build\nExpected it at: ${deps.webDistDir}\n`,
        );
    });
  }

  return app;
}
