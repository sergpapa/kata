import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import type { Db } from './modules/lifecycle/database.js';
import { readSchemaVersion } from './modules/lifecycle/database.js';
import { loadReleaseSummary } from './modules/content/repository.js';
import { registerCourseRoutes } from './modules/content/courseRoutes.js';
import type { CourseState } from './modules/content/types.js';

export interface AppDeps {
  readonly db: Db;
  /**
   * Every configured course with the outcome of its import, in config order (ADR 0018). A refused
   * course is served as its refusal, not hidden. Required, not defaulted: a default would let an
   * unwired composition start and answer "no courses" instead of failing where somebody is reading.
   */
  readonly courses: readonly CourseState[];
  /** Built client directory. Omitted in tests and in development, where Vite serves the client. */
  readonly webDistDir?: string;
}

/**
 * Builds the HTTP application without binding a port, so tests drive it through `app.inject`.
 * Dependencies are required rather than defaulted: a default would let an unwired composition
 * start and fail at runtime instead of at the type level.
 */
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
   * What a course card needs, for every configured course. Answers 200 even when every course is
   * refused: a refusal is content's state, and a 5xx would report a broken app when the app is fine.
   */
  app.get('/api/courses', async () => ({
    courses: deps.courses.map((course) => {
      const identity = { courseId: course.courseId, title: course.title };
      if (course.release.state === 'failed') {
        return { ...identity, state: 'failed', failure: course.release.failure };
      }
      const summary = loadReleaseSummary(deps.db, course.release.releaseRowId);
      if (!summary) {
        throw new Error(
          `Course ${course.courseId} reported release row ${course.release.releaseRowId}, and the record store has no such row.`,
        );
      }
      return {
        ...identity,
        state: 'imported',
        audience: summary.audience,
        lessonCount: summary.lessons.length,
      };
    }),
  }));

  for (const course of deps.courses) {
    void app.register(
      async (scoped) => {
        registerCourseRoutes(scoped, deps.db, course);
      },
      { prefix: `/api/courses/${course.courseId}` },
    );
  }

  /**
   * Anything under a course the app does not serve. A known course's own routes are static and win
   * over this pattern, so reaching here with a known id means a path that course does not have.
   */
  app.all<{ Params: { courseId: string } }>('/api/courses/:courseId/*', async (request, reply) => {
    const { courseId } = request.params;
    if (deps.courses.some((course) => course.courseId === courseId)) {
      return reply.code(404).send({ error: 'not_found', message: `No route for ${request.url}` });
    }
    return reply.code(404).send({
      error: 'course_not_found',
      message: `This app serves no course ${courseId}.`,
    });
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
