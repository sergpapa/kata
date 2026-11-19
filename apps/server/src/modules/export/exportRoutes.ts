import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { repoRoot } from '../../config.js';
import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import { loadReleaseSummary } from '../content/repository.js';
import type { CourseState } from '../content/types.js';
import { readExport } from './exportData.js';
import { exportMarkdown, twoDigits } from './exportMarkdown.js';

/**
 * `GET /api/courses/<courseId>/export` — the owner's work for a lesson range, as one Markdown file
 * (docs/specs/export.md, ADR 0020). Read-only: nothing here writes to the store.
 */

export interface ExportRouteDeps {
  readonly db: Db;
  readonly course: CourseState;
  readonly activitiesOfRelease: () => readonly LessonActivity[];
}

type Query = Readonly<Record<string, unknown>>;

class Refusal {
  constructor(
    readonly error: string,
    readonly message: string,
  ) {}
}

/** One plain value of a query parameter, or a refusal naming the parameter (EX13). */
function single(query: Query, name: string, missing: string): string {
  const value = query[name];
  if (Array.isArray(value)) {
    return refuse('export_parameter_repeated', `\`${name}\` was given more than once.`);
  }
  if (typeof value !== 'string' || value === '') return refuse('export_parameter_missing', missing);
  return value;
}

function refuse(error: string, message: string): never {
  throw new Refusal(error, message);
}

function conversationsOf(query: Query): boolean {
  const value = query.conversations;
  if (value === undefined) return false;
  if (Array.isArray(value)) {
    return refuse('export_parameter_repeated', '`conversations` was given more than once.');
  }
  if (value === '0') return false;
  if (value === '1') return true;
  return refuse(
    'export_conversations_invalid',
    `\`conversations\` must be 0 or 1, and it was ${JSON.stringify(value)}.`,
  );
}

let appVersion: string | undefined;

/** The app's own version, read once: the review form asks which build the owner used. */
function readAppVersion(): string {
  appVersion ??= (
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { version: string }
  ).version;
  return appVersion;
}

export function registerExportRoutes(app: FastifyInstance, deps: ExportRouteDeps): void {
  const { db, course } = deps;
  const { release } = course;

  app.get<{ Querystring: Query }>('/export', async (request, reply) => {
    if (release.state === 'failed') return { state: 'failed', failure: release.failure };

    try {
      const query = request.query;
      const fromId = single(query, 'from', 'Choose the first lesson of the export with `from`.');
      const toId = single(query, 'to', 'Choose the last lesson of the export with `to`.');
      const conversations = conversationsOf(query);

      // One transaction, and no await inside it: a save cannot land half in the file (EX12).
      const now = new Date();
      const content = db.transaction(() => {
        const summary = loadReleaseSummary(db, release.releaseRowId);
        if (!summary) {
          throw new Error(
            `The import reported release row ${release.releaseRowId}, and the store has none.`,
          );
        }
        const indexOf = (lessonId: string) => {
          const at = summary.lessons.findIndex((one) => one.candidateLessonId === lessonId);
          return at === -1
            ? refuse('export_lesson_not_found', `This course's release has no lesson ${lessonId}.`)
            : at;
        };
        const fromIndex = indexOf(fromId);
        const toIndex = indexOf(toId);
        if (fromIndex > toIndex) {
          refuse(
            'export_range_backwards',
            `${fromId} comes after ${toId} in this release, so the range holds nothing. Put the earlier lesson first.`,
          );
        }
        return readExport(db, {
          release: summary,
          activities: deps.activitiesOfRelease(),
          fromIndex,
          toIndex,
          conversations,
        });
      })();

      const exportedAt = now.toISOString();
      const fileName = `EduCode_${course.courseId}_Lessons_${twoDigits(content.from.order)}-${twoDigits(content.to.order)}_${exportedAt.slice(0, 10)}.md`;
      return reply
        .header('content-type', 'text/markdown; charset=utf-8')
        .header('content-disposition', `attachment; filename="${fileName}"`)
        .send(
          exportMarkdown(content, {
            courseId: course.courseId,
            courseTitle: course.title,
            appVersion: readAppVersion(),
            exportedAt,
          }),
        );
    } catch (error) {
      if (error instanceof Refusal) {
        return reply.code(400).send({ error: error.error, message: error.message });
      }
      throw error;
    }
  });
}
