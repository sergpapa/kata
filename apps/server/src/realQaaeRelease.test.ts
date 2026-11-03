import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { importCourses } from './modules/content/courses.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';

/**
 * Criteria C15–C16 in docs/specs/multi-course.md, against the QA course's own first release and the
 * real full-stack release beside it — the pair the owner actually starts the app with.
 */

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

describe('the QA course’s first release', () => {
  it('imports beside the full-stack release with neither refused', () => {
    db = openDatabase(':memory:');

    const courses = importCourses(db, loadConfig({}).courses);

    for (const course of courses) {
      const detail = course.release.state === 'failed' ? course.release.failure.message : '';
      expect(course.release.state, `${course.courseId}: ${detail}`).toBe('imported');
    }
  });

  it('carries exactly one lesson, Q01’s opening one, with no lab kit', () => {
    const manifest = readJson<{ release_id: string; lessons: ManifestLesson[] }>(
      'learning-release.json',
    );

    expect(manifest.release_id).toBe('QAAE-LESSON-01');
    expect(manifest.lessons).toHaveLength(1);
    expect(manifest.lessons[0]).toMatchObject({
      lesson_id: 'LS-Q01-01',
      document_id: 'QAAE-STUDENT-01',
      module: 'Q01',
      lab_id: null,
    });
  });

  it('gives the lesson activities with distinct ids, each naming the lesson’s own version', () => {
    const manifest = readJson<{ lessons: ManifestLesson[] }>('learning-release.json');
    const { activities } = readJson<{ activities: ActivityRecord[] }>('trial-activities.json');

    expect(activities.length).toBeGreaterThan(0);
    expect(new Set(activities.map((activity) => activity.activity_id)).size).toBe(
      activities.length,
    );
    for (const activity of activities) {
      expect(activity.activity_id).toMatch(/^ACT-Q01-01-\d\d$/);
      expect(activity.lesson_id).toBe('LS-Q01-01');
      expect(activity.lesson_version).toBe(manifest.lessons[0]?.version);
    }
  });

  it('names, for every activity, a heading that appears exactly once in the lesson (C16)', () => {
    const manifest = readJson<{ lessons: ManifestLesson[] }>('learning-release.json');
    const { activities } = readJson<{ activities: ActivityRecord[] }>('trial-activities.json');
    const source = fs.readFileSync(path.join(releaseDir, manifest.lessons[0]?.path ?? ''), 'utf8');
    // Fenced code is removed first: a `#` line inside a code block is a comment, not a heading.
    const prose = source.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
    const headings = [...prose.matchAll(/^#{1,6}[ \t]+(.*)$/gm)].map((match) =>
      (match[1] ?? '').trim(),
    );

    for (const activity of activities) {
      const hits = headings.filter((heading) => heading === activity.source_heading);
      expect(hits, `${activity.activity_id} asks for "${activity.source_heading}"`).toHaveLength(1);
    }
  });

  it('serves the lesson and its activities through the QA course', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, courses: importCourses(db, loadConfig({}).courses) });

    const response = await app.inject({
      method: 'GET',
      url: '/api/courses/QAAE/lessons/LS-Q01-01',
    });
    const body = response.json() as { state: string; activities: unknown[] };

    expect(response.statusCode).toBe(200);
    expect(body.state).toBe('lesson');
    expect(body.activities.length).toBeGreaterThan(0);
    await app.close();
  });
});
