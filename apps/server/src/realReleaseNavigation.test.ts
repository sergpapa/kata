import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testCourse } from './modules/content/testkit/courseFixture.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';

/**
 * Criterion P4 in docs/specs/reader-navigation-and-resume.md, against the author's own release: a
 * fixture proves the neighbour contract, but only the real fifteen proves the chain holds over what
 * the author actually shipped — no off-by-one, no duplicate order, no title drift.
 *
 * Moved here from the screenshot gate on test-guardian's PRE finding: the chain is a data fact, and
 * vitest is the tool that can state it exactly.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const releaseDir = path.join(
  repoRoot,
  'content',
  'releases',
  'http-first-fifteen-v1_0_1',
  'content',
);

interface Neighbour {
  order: number;
  candidateLessonId: string;
  displayTitle: string;
}

interface ServedLesson {
  displayTitle: string;
  previous: Neighbour | null;
  next: Neighbour | null;
}

let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
});

describe('the neighbour chain across the real fifteen-lesson release', () => {
  it('names every neighbour in manifest order, carrying that lesson’s own served title', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({
      db,
      courses: [testCourse('FSSE', releaseDir, importRelease(db, releaseDir))],
    });

    const manifest = JSON.parse(
      fs.readFileSync(path.join(releaseDir, 'learning-release.json'), 'utf8'),
    ) as { lessons: { order: number; lesson_id: string }[] };
    const ordered = [...manifest.lessons].sort((a, b) => a.order - b.order);
    expect(ordered).toHaveLength(15);

    const served = new Map<string, ServedLesson>();
    for (const entry of ordered) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/courses/FSSE/lessons/${encodeURIComponent(entry.lesson_id)}`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        state: string;
        lesson: { displayTitle: string };
        previous: Neighbour | null;
        next: Neighbour | null;
      };
      expect(body.state).toBe('lesson');
      served.set(entry.lesson_id, {
        displayTitle: body.lesson.displayTitle,
        previous: body.previous,
        next: body.next,
      });
    }

    ordered.forEach((entry, index) => {
      const lesson = served.get(entry.lesson_id) as ServedLesson;
      const before = index > 0 ? ordered[index - 1] : undefined;
      const after = index < ordered.length - 1 ? ordered[index + 1] : undefined;

      if (before) {
        expect(lesson.previous).toEqual({
          order: before.order,
          candidateLessonId: before.lesson_id,
          displayTitle: (served.get(before.lesson_id) as ServedLesson).displayTitle,
        });
      } else {
        expect(lesson.previous).toBeNull();
      }

      if (after) {
        expect(lesson.next).toEqual({
          order: after.order,
          candidateLessonId: after.lesson_id,
          displayTitle: (served.get(after.lesson_id) as ServedLesson).displayTitle,
        });
      } else {
        expect(lesson.next).toBeNull();
      }
    });

    await app.close();
  });
});
