import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { importCourses } from './modules/content/courses.js';
import { makeTempDir, removeDir } from './modules/content/testkit/releaseFixture.js';
import {
  writeCourseRelease,
  type CourseReleaseSpec,
} from './modules/content/testkit/twoCourses.js';
import { migrations } from './modules/lifecycle/migrations.js';
import { migrate, openDatabase, type Db } from './modules/lifecycle/database.js';
import { loadResumePoint } from './modules/learner/resumeRepository.js';

/**
 * Criteria C5–C9 in docs/specs/multi-course.md: the course-scoped API, the course list, shared work
 * on a shared lesson, and one resume point per course.
 */

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

function release(spec: CourseReleaseSpec): string {
  const dir = makeTempDir();
  tempDirs.push(dir);
  return writeCourseRelease(dir, spec);
}

const shared = { activity_id: 'ACT-SHARED', lesson_id: 'FIX-LS-01' };
const fixOnly = { activity_id: 'ACT-FIX-ONLY', lesson_id: 'FIX-LS-02' };

/** FIX and QAX, sharing lesson FIX-LS-01 and its one activity. */
function twoCourseApp(second: CourseReleaseSpec = sharingQax) {
  db = openDatabase(':memory:');
  const courses = importCourses(db, [
    {
      courseId: 'FIX',
      title: 'Fixture course',
      releaseDir: release({ releasePrefix: 'FIX', activities: [shared, fixOnly] }),
    },
    { courseId: 'QAX', title: 'Second course', releaseDir: release(second) },
  ]);
  return buildApp({ db, courses });
}

/** QAX carries FIX-LS-01 at a later version than FIX does, so provenance shows whose it is. */
const sharingQax: CourseReleaseSpec = {
  releasePrefix: 'QAX',
  audience: 'Second audience',
  lessons: [
    { lessonId: 'FIX-LS-01', documentId: 'FIX-DOC-01', version: '1.1.0-draft' },
    { lessonId: 'QAX-LS-02', documentId: 'QAX-DOC-02' },
  ],
  activities: [shared],
};

function responseRows(): number {
  return (db?.prepare('SELECT count(*) AS n FROM learner_response').get() as { n: number }).n;
}

describe('GET /api/courses (C7)', () => {
  it('lists every configured course in config order, each with its own audience and size', async () => {
    const app = twoCourseApp({
      releasePrefix: 'QAX',
      audience: 'Second audience',
      singleLesson: true,
    });

    const response = await app.inject({ method: 'GET', url: '/api/courses' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      courses: [
        {
          courseId: 'FIX',
          title: 'Fixture course',
          state: 'imported',
          audience: 'Fixture',
          lessonCount: 2,
        },
        {
          courseId: 'QAX',
          title: 'Second course',
          state: 'imported',
          audience: 'Second audience',
          lessonCount: 1,
        },
      ],
    });
    await app.close();
  });

  it('answers 200 with every refusal when no course imported at all', async () => {
    db = openDatabase(':memory:');
    const nowhere = makeTempDir();
    tempDirs.push(nowhere);
    const courses = importCourses(db, [
      { courseId: 'FIX', title: 'Fixture course', releaseDir: `${nowhere}/fix` },
      { courseId: 'QAX', title: 'Second course', releaseDir: `${nowhere}/qax` },
    ]);
    const app = buildApp({ db, courses });

    const response = await app.inject({ method: 'GET', url: '/api/courses' });
    const body = response.json() as { courses: { courseId: string; state: string }[] };

    expect(response.statusCode).toBe(200);
    expect(body.courses.map((course) => [course.courseId, course.state])).toEqual([
      ['FIX', 'failed'],
      ['QAX', 'failed'],
    ]);
    await app.close();
  });

  it('lists a refused course with the importer’s own failure, and still answers 200', async () => {
    const app = twoCourseApp({ releasePrefix: 'FIX' });

    const response = await app.inject({ method: 'GET', url: '/api/courses' });
    const body = response.json() as { courses: Record<string, unknown>[] };

    expect(response.statusCode).toBe(200);
    expect(body.courses[1]).toEqual({
      courseId: 'QAX',
      title: 'Second course',
      state: 'failed',
      failure: expect.objectContaining({ code: 'release_course_mismatch' }) as unknown,
    });
    await app.close();
  });
});

describe('course-scoped endpoints (C5, C6)', () => {
  it('names its course on the release answer', async () => {
    const app = twoCourseApp();

    const response = await app.inject({ method: 'GET', url: '/api/courses/QAX/release' });
    const body = response.json() as {
      course: unknown;
      release: { releaseId: string; audience: string };
      lessons: { candidateLessonId: string }[];
    };

    expect(body.course).toEqual({ courseId: 'QAX', title: 'Second course' });
    expect(body.release.releaseId).toBe('QAX-RELEASE');
    expect(body.release.audience).toBe('Second audience');
    expect(body.lessons.map((lesson) => lesson.candidateLessonId)).toEqual([
      'FIX-LS-01',
      'QAX-LS-02',
    ]);
    await app.close();
  });

  it('serves each course only its own lessons', async () => {
    const app = twoCourseApp();

    const theirs = await app.inject({ method: 'GET', url: '/api/courses/QAX/lessons/FIX-LS-02' });
    const ours = await app.inject({ method: 'GET', url: '/api/courses/FIX/lessons/FIX-LS-02' });

    expect(theirs.statusCode).toBe(404);
    expect(theirs.json()).toMatchObject({ error: 'lesson_not_found' });
    expect(ours.statusCode).toBe(200);
    await app.close();
  });

  it('serves each course’s kit from that course’s own release directory', async () => {
    const app = twoCourseApp();

    const fix = await app.inject({
      method: 'GET',
      url: '/api/courses/FIX/labs/FIX-LAB-02/download',
    });
    const qax = await app.inject({
      method: 'GET',
      url: '/api/courses/QAX/labs/FIX-LAB-02/download',
    });

    expect(fix.statusCode).toBe(200);
    expect(fix.body).toBe('PK FIX kit bytes');
    expect(qax.statusCode).toBe(200);
    expect(qax.body).toBe('PK QAX kit bytes');
    await app.close();
  });

  it('serves a refused course’s refusal while the other course goes on serving (C2)', async () => {
    const app = twoCourseApp({ releasePrefix: 'FIX' });

    const refused = await app.inject({ method: 'GET', url: '/api/courses/QAX/release' });
    const save = await app.inject({
      method: 'PUT',
      url: '/api/courses/QAX/activities/ACT-SHARED/responses/prediction',
      payload: { text: 'Through a refused course.', expectedRevision: 0 },
    });
    const other = await app.inject({ method: 'GET', url: '/api/courses/FIX/lessons/FIX-LS-01' });

    expect(refused.statusCode).toBe(200);
    expect(refused.json()).toMatchObject({
      state: 'failed',
      failure: { code: 'release_course_mismatch' },
    });
    expect(save.json()).toMatchObject({ state: 'failed' });
    expect(responseRows()).toBe(0);
    expect(other.statusCode).toBe(200);
    await app.close();
  });

  it.each([
    ['GET', '/api/courses/NOPE/release'],
    ['GET', '/api/courses/NOPE/lessons/FIX-LS-01'],
    ['GET', '/api/courses/NOPE/resume-point'],
    ['PUT', '/api/courses/NOPE/resume-point'],
    ['GET', '/api/courses/NOPE/labs/FIX-LAB-02/download'],
    ['PUT', '/api/courses/NOPE/activities/ACT-SHARED/responses/prediction'],
  ] as const)('answers %s %s with course_not_found', async (method, url) => {
    const app = twoCourseApp();

    const response = await app.inject({
      method,
      url,
      ...(method === 'PUT' ? { payload: { text: 'x', expectedRevision: 0 } } : {}),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'course_not_found' });
    expect((response.json() as { message: string }).message).toContain('NOPE');
    await app.close();
  });

  it.each([
    ['GET', '/api/release'],
    ['GET', '/api/lessons/FIX-LS-01'],
    ['GET', '/api/resume-point'],
    ['GET', '/api/labs/FIX-LAB-02/download'],
    ['PUT', '/api/activities/ACT-SHARED/responses/prediction'],
  ] as const)('no longer answers the unscoped %s %s', async (method, url) => {
    const app = twoCourseApp();

    const response = await app.inject({
      method,
      url,
      ...(method === 'PUT' ? { payload: { text: 'x', expectedRevision: 0 } } : {}),
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

describe('work on a shared lesson (C8)', () => {
  it('shows an answer saved through one course on the same activity in the other', async () => {
    const app = twoCourseApp();

    const saved = await app.inject({
      method: 'PUT',
      url: '/api/courses/QAX/activities/ACT-SHARED/responses/prediction',
      payload: { text: 'It will say 200.', expectedRevision: 0 },
    });
    const read = await app.inject({ method: 'GET', url: '/api/courses/FIX/lessons/FIX-LS-01' });
    const body = read.json() as { responses: { activityId: string; text: string }[] };

    expect(saved.statusCode).toBe(200);
    expect(body.responses).toEqual([
      expect.objectContaining({ activityId: 'ACT-SHARED', text: 'It will say 200.' }),
    ]);
    await app.close();
  });

  it('refuses a save through a course for an activity only the other course carries', async () => {
    const app = twoCourseApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/courses/QAX/activities/ACT-FIX-ONLY/responses/prediction',
      payload: { text: 'Not this course’s.', expectedRevision: 0 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'activity_not_found' });
    expect(responseRows()).toBe(0);
    await app.close();
  });

  it('stamps the provenance of the course the save came through', async () => {
    const app = twoCourseApp();

    await app.inject({
      method: 'PUT',
      url: '/api/courses/QAX/activities/ACT-SHARED/responses/prediction',
      payload: { text: 'Through the second course.', expectedRevision: 0 },
    });
    const row = db
      ?.prepare('SELECT release_id, content_version FROM learner_response WHERE activity_id = ?')
      .get('ACT-SHARED') as { release_id: string; content_version: string };

    // QAX carries the shared lesson at 1.1.0-draft; FIX at 1.0.0-draft.
    expect(row).toEqual({ release_id: 'QAX-RELEASE', content_version: '1.1.0-draft' });
    await app.close();
  });
});

describe('one resume point per course (C9)', () => {
  it('keeps each course’s last lesson apart', async () => {
    const app = twoCourseApp();

    await app.inject({
      method: 'PUT',
      url: '/api/courses/FIX/resume-point',
      payload: { candidateLessonId: 'FIX-LS-02' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/courses/QAX/resume-point',
      payload: { candidateLessonId: 'QAX-LS-02' },
    });
    const fix = await app.inject({ method: 'GET', url: '/api/courses/FIX/resume-point' });
    const qax = await app.inject({ method: 'GET', url: '/api/courses/QAX/resume-point' });

    expect(fix.json()).toMatchObject({ state: 'set', candidateLessonId: 'FIX-LS-02' });
    expect(qax.json()).toMatchObject({ state: 'set', candidateLessonId: 'QAX-LS-02' });
    await app.close();
  });

  it('refuses a resume point naming a lesson only the other course carries', async () => {
    const app = twoCourseApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/courses/QAX/resume-point',
      payload: { candidateLessonId: 'FIX-LS-02' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'lesson_not_found' });
    await app.close();
  });

  it('moves the existing single resume point to the full-stack course when migrating', () => {
    // A store as the app left it before this slice: migrations 1–5 applied, one pointer recorded.
    db = openBareDatabaseAtMigration(5);
    db.prepare(
      'INSERT INTO resume_point (id, candidate_lesson_id, recorded_at) VALUES (1, ?, ?)',
    ).run('LS-M020-07', '2026-10-01T09:00:00.000Z');

    migrate(db);

    expect(loadResumePoint(db, 'FSSE')).toEqual({
      candidateLessonId: 'LS-M020-07',
      recordedAt: '2026-10-01T09:00:00.000Z',
    });
    expect(loadResumePoint(db, 'QAAE')).toBeUndefined();
    const oldTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resume_point'")
      .get();
    expect(oldTable).toBeUndefined();
  });

  it('migrates a store that never recorded a resume point, and a second run changes nothing', () => {
    db = openBareDatabaseAtMigration(5);

    migrate(db);
    migrate(db);

    expect(loadResumePoint(db, 'FSSE')).toBeUndefined();
  });
});

/** A connection with only the first `count` migrations applied, recorded as migrate() records them. */
function openBareDatabaseAtMigration(count: number): Db {
  const bare = new Database(':memory:');
  bare.exec(
    'CREATE TABLE applied_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  for (const migration of migrations.slice(0, count)) {
    bare.exec(migration.sql);
    bare
      .prepare('INSERT INTO applied_migrations (id, name, applied_at) VALUES (?, ?, ?)')
      .run(migration.id, migration.name, '2026-10-01T00:00:00.000Z');
  }
  return bare;
}
