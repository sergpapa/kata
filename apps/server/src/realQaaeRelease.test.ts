import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { importCourses } from './modules/content/courses.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { inertFeedback } from './modules/feedback/testkit/fakeRunner.js';

/**
 * Criteria C15–C16 in docs/specs/multi-course.md and A10 in docs/specs/release-additions.md, against
 * the QA course's current release and the real full-stack release beside it — the pair the owner
 * actually starts the app with. Since 2026-11-20 that is the Q02 release: modules Q01 and Q02, twelve
 * lessons, four kits.
 */

/** Q01 then Q02 in course order (ADRs 0023 and 0024), with the kit each lesson uses. */
const LESSONS = [
  {
    lesson_id: 'LS-Q01-01',
    document_id: 'QAAE-STUDENT-01',
    module: 'Q01',
    lab_id: null,
    prefix: 'ACT-Q01-01-',
  },
  {
    lesson_id: 'LS-M001-01',
    document_id: 'M001-STUDENT-01',
    module: 'M001',
    lab_id: 'M001-LAB-01',
    prefix: 'ACT-M001-01-',
  },
  {
    lesson_id: 'LS-M001-02',
    document_id: 'M001-STUDENT-02',
    module: 'M001',
    lab_id: 'M001-LAB-01',
    prefix: 'ACT-M001-02-',
  },
  {
    lesson_id: 'LS-Q01-02',
    document_id: 'QAAE-STUDENT-04',
    module: 'Q01',
    lab_id: 'QAAE-LAB-Q01-02',
    prefix: 'ACT-Q01-02-',
  },
  {
    lesson_id: 'LS-Q01-03',
    document_id: 'QAAE-STUDENT-05',
    module: 'Q01',
    lab_id: 'QAAE-LAB-Q01-03',
    prefix: 'ACT-Q01-03-',
  },
  {
    lesson_id: 'LS-M002-01',
    document_id: 'M002-STUDENT-01',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-01-',
  },
  {
    lesson_id: 'LS-M002-02',
    document_id: 'M002-STUDENT-02',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-02-',
  },
  {
    lesson_id: 'LS-M002-03',
    document_id: 'M002-STUDENT-03',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-03-',
  },
  {
    lesson_id: 'LS-M002-04',
    document_id: 'M002-STUDENT-04',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-04-',
  },
  {
    lesson_id: 'LS-M002-05',
    document_id: 'M002-STUDENT-05',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-05-',
  },
  {
    lesson_id: 'LS-M002-06',
    document_id: 'M002-STUDENT-06',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-06-',
  },
  {
    lesson_id: 'LS-M002-07',
    document_id: 'M002-STUDENT-07',
    module: 'M002',
    lab_id: 'M002-LAB-01',
    prefix: 'ACT-M002-07-',
  },
] as const;

const qaae = loadConfig({}).courses.find((course) => course.courseId === 'QAAE');
const releaseDir = qaae?.releaseDir ?? '';

interface ManifestLesson {
  lesson_id: string;
  document_id: string;
  version: string;
  module: string;
  path: string;
  lab_id: string | null;
}

interface ActivityRecord {
  activity_id: string;
  lesson_id: string;
  lesson_version: string;
  source_heading: string;
}

function readJson<T>(relative: string): T {
  return JSON.parse(fs.readFileSync(path.join(releaseDir, relative), 'utf8')) as T;
}

let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
});

describe('the QA course’s current release', () => {
  it('imports beside the full-stack release with neither refused', () => {
    db = openDatabase(':memory:');

    const courses = importCourses(db, loadConfig({}).courses);

    for (const course of courses) {
      const detail = course.release.state === 'failed' ? course.release.failure.message : '';
      expect(course.release.state, `${course.courseId}: ${detail}`).toBe('imported');
    }
  });

  it('carries Q01’s five lessons and Q02’s seven in course order, each with its kit (A10)', () => {
    const manifest = readJson<{ release_id: string; lessons: ManifestLesson[] }>(
      'learning-release.json',
    );

    expect(manifest.release_id).toBe('QAAE-Q02');
    expect(manifest.lessons.map((lesson) => lesson.lesson_id)).toEqual(
      LESSONS.map((lesson) => lesson.lesson_id),
    );
    for (const [index, expected] of LESSONS.entries()) {
      expect(manifest.lessons[index]).toMatchObject({
        lesson_id: expected.lesson_id,
        document_id: expected.document_id,
        module: expected.module,
        lab_id: expected.lab_id,
      });
    }
  });

  it('offers four kits, each serving the lessons that name it (A10)', () => {
    const manifest = readJson<{
      lab_downloads: { lab_id: string; path: string; lesson_ids: string[] }[];
    }>('learning-release.json');

    expect(manifest.lab_downloads.map((lab) => [lab.lab_id, lab.lesson_ids])).toEqual([
      ['M001-LAB-01', ['LS-M001-01', 'LS-M001-02']],
      ['QAAE-LAB-Q01-02', ['LS-Q01-02']],
      ['QAAE-LAB-Q01-03', ['LS-Q01-03']],
      [
        'M002-LAB-01',
        [
          'LS-M002-01',
          'LS-M002-02',
          'LS-M002-03',
          'LS-M002-04',
          'LS-M002-05',
          'LS-M002-06',
          'LS-M002-07',
        ],
      ],
    ]);
    for (const lab of manifest.lab_downloads) {
      expect(fs.existsSync(path.join(releaseDir, lab.path)), lab.path).toBe(true);
    }
  });

  it('gives every lesson activities with distinct ids, each naming its lesson’s own version', () => {
    const manifest = readJson<{ lessons: ManifestLesson[] }>('learning-release.json');
    const { activities } = readJson<{ activities: ActivityRecord[] }>('trial-activities.json');

    expect(new Set(activities.map((activity) => activity.activity_id)).size).toBe(
      activities.length,
    );
    for (const expected of LESSONS) {
      const lesson = manifest.lessons.find((entry) => entry.lesson_id === expected.lesson_id);
      const own = activities.filter((activity) => activity.lesson_id === expected.lesson_id);
      expect(own.length, expected.lesson_id).toBeGreaterThan(0);
      for (const activity of own) {
        expect(activity.activity_id).toMatch(new RegExp(`^${expected.prefix}\\d\\d$`));
        expect(activity.lesson_version, activity.activity_id).toBe(lesson?.version);
      }
    }
    expect(
      activities.every((activity) =>
        LESSONS.some((lesson) => lesson.lesson_id === activity.lesson_id),
      ),
    ).toBe(true);
  });

  it('names, for every activity, a heading that appears exactly once in its lesson (C16)', () => {
    const manifest = readJson<{ lessons: ManifestLesson[] }>('learning-release.json');
    const { activities } = readJson<{ activities: ActivityRecord[] }>('trial-activities.json');

    for (const lesson of manifest.lessons) {
      const source = fs.readFileSync(path.join(releaseDir, lesson.path), 'utf8');
      // Fenced code is removed first: a `#` line inside a code block is a comment, not a heading.
      const prose = source.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
      const headings = [...prose.matchAll(/^#{1,6}[ \t]+(.*)$/gm)].map((match) =>
        (match[1] ?? '').trim(),
      );
      for (const activity of activities.filter((entry) => entry.lesson_id === lesson.lesson_id)) {
        const hits = headings.filter((heading) => heading === activity.source_heading);
        expect(hits, `${activity.activity_id} asks for "${activity.source_heading}"`).toHaveLength(
          1,
        );
      }
    }
  });

  it('serves every lesson and its activities through the QA course (A10)', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({
      feedback: inertFeedback(),
      db,
      courses: importCourses(db, loadConfig({}).courses),
    });

    for (const { lesson_id } of LESSONS) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/courses/QAAE/lessons/${lesson_id}`,
      });
      const body = response.json() as { state: string; activities: unknown[] };

      expect(response.statusCode, lesson_id).toBe(200);
      expect(body.state, lesson_id).toBe('lesson');
      expect(body.activities.length, lesson_id).toBeGreaterThan(0);
    }
    await app.close();
  });
});
