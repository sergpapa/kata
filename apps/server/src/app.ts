import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import type { Db } from './modules/lifecycle/database.js';
import { readSchemaVersion } from './modules/lifecycle/database.js';
import { loadLesson, loadReleaseSummary } from './modules/content/repository.js';
import { learnerFacingFacts, lessonBodyBelowTitle } from './modules/content/lessonView.js';
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
      };
    },
  );

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
