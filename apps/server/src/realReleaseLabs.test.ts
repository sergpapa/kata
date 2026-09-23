import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';

/**
 * Criteria K3, K4 and D7 in docs/specs/lab-downloads.md, against the author's own release.
 *
 * The fixture proves the contract; only the real fifteen proves it over what was actually shipped.
 * Three separate things can disagree here and a fixture can show none of them: the manifest's
 * lesson-to-lab mapping, the filename each lesson names in its own front matter, and the bytes on
 * disk. This is the 06–08 handoff's "earlier kits remain available and their checksums match" and
 * the 09–13 handoff's "confirm its file hash matches the release manifest", asserted rather than
 * described.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const releaseDir = path.join(
  repoRoot,
  'content',
  'releases',
  'http-first-fifteen-v1_0_1',
  'content',
);

interface ManifestLab {
  lab_id: string;
  version: string;
  path: string;
  sha256: string;
  lesson_ids: string[];
}

interface ManifestLesson {
  order: number;
  lesson_id: string;
  path: string;
  lab_id: string | null;
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(releaseDir, 'learning-release.json'), 'utf8'),
) as { lessons: ManifestLesson[]; lab_downloads: ManifestLab[] };

const labsById = new Map(manifest.lab_downloads.map((lab) => [lab.lab_id, lab]));

/** What the lesson file itself calls its kit, which is the name the prose tells the reader to use. */
function exerciseKitOf(lessonPath: string): string | null {
  const source = fs.readFileSync(path.join(releaseDir, lessonPath), 'utf8');
  return /^exercise_kit:\s*(.+)$/m.exec(source)?.[1].trim() ?? null;
}

function sha256Of(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

let db: Db | undefined;
let app: FastifyInstance;

beforeAll(() => {
  db = openDatabase(':memory:');
  app = buildApp({ db, release: importRelease(db, releaseDir), releaseDir });
});

afterAll(() => {
  db?.close();
  db = undefined;
});

describe('the fifteen lessons and their five kits', () => {
  /**
   * A claim about the release, not about the app — and the only one here that is. It exists because
   * every other case in this file is generated from these two tables: an empty `lab_downloads`
   * would produce zero cases and a green file that tested nothing. This is the table's own guard.
   */
  it('has tables to drive the cases below: five kits, fifteen lessons, one without a kit', () => {
    expect(manifest.lab_downloads).toHaveLength(5);
    expect(manifest.lessons).toHaveLength(15);
    const withoutKit = manifest.lessons.filter((lesson) => !lesson.lab_id);
    expect(withoutKit.map((lesson) => lesson.lesson_id)).toEqual(['LS-M020-01']);
  });

  it.each(manifest.lessons.map((lesson) => [lesson.lesson_id, lesson] as const))(
    'serves %s the kit the manifest gives it, and nothing invented',
    async (lessonId, lesson) => {
      const response = await app.inject({ method: 'GET', url: `/api/lessons/${lessonId}` });
      const served = response.json().labKit;

      if (!lesson.lab_id) {
        expect(served).toBeNull();
        return;
      }

      const declared = labsById.get(lesson.lab_id);
      expect(declared).toBeDefined();
      expect(served).toEqual({
        labId: declared?.lab_id,
        version: declared?.version,
        fileName: path.posix.basename(declared?.path ?? ''),
        byteSize: fs.statSync(path.join(releaseDir, declared?.path ?? '')).size,
        sha256: declared?.sha256.toLowerCase(),
        lessonIds: declared?.lesson_ids,
      });
    },
  );

  it.each(
    manifest.lessons
      .filter((lesson) => lesson.lab_id)
      .map((lesson) => [lesson.lesson_id, lesson] as const),
  )(
    'offers %s the same file its own front matter tells the reader to use',
    async (lessonId, lesson) => {
      // A release where these disagree would have the page hand over one kit while the lesson's
      // prose names another. The importer does not check it, so this does.
      const response = await app.inject({ method: 'GET', url: `/api/lessons/${lessonId}` });

      expect(response.json().labKit.fileName).toBe(exerciseKitOf(lesson.path));
    },
  );
});

describe('every kit the author shipped, downloaded', () => {
  it.each(manifest.lab_downloads.map((lab) => [lab.lab_id, lab] as const))(
    'hands over %s with the bytes the registry describes',
    async (labId, lab) => {
      const response = await app.inject({ method: 'GET', url: `/api/labs/${labId}/download` });

      expect(response.statusCode).toBe(200);
      expect(sha256Of(response.rawPayload)).toBe(lab.sha256.toLowerCase());
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename="${path.posix.basename(lab.path)}"`,
      );
    },
  );

  it('keeps every earlier kit available, not only the newest', async () => {
    const answered = await Promise.all(
      manifest.lab_downloads.map(async (lab) => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/labs/${lab.lab_id}/download`,
        });
        return [lab.lab_id, response.statusCode] as const;
      }),
    );

    expect(answered).toEqual(manifest.lab_downloads.map((lab) => [lab.lab_id, 200]));
  });
});
