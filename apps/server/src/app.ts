import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import type { Db } from './modules/lifecycle/database.js';
import { readSchemaVersion } from './modules/lifecycle/database.js';
import {
  lessonExists,
  loadLesson,
  loadNeighbours,
  loadReleaseSummary,
} from './modules/content/repository.js';
import { learnerFacingFacts, lessonBodyBelowTitle } from './modules/content/lessonView.js';
import { loadResumePoint, saveResumePoint } from './modules/learner/resumeRepository.js';
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
export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false });

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
      return {
        state: 'lesson',
        release: { releaseId: summary.releaseId, version: summary.version },
        lesson: {
          ...identity,
          facts: learnerFacingFacts(frontMatter),
          bodyMarkdown: lessonBodyBelowTitle(sourceText),
        },
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
