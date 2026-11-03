import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../lifecycle/database.js';
import { importCourses } from './courses.js';
import { makeTempDir, removeDir } from './testkit/releaseFixture.js';
import { writeCourseRelease, type CourseReleaseSpec } from './testkit/twoCourses.js';
import type { CourseState } from './types.js';

/**
 * Criteria C2–C4 in docs/specs/multi-course.md: each course's release is proven on its own, a
 * release must belong to its course, and two courses may not give one ID two meanings — learner
 * work is keyed by activity, so a reused ID would silently merge two different answers.
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

function importBoth(first: string, second: string, secondId = 'QAX'): readonly CourseState[] {
  db = openDatabase(':memory:');
  return importCourses(db, [
    { courseId: 'FIX', title: 'Fixture course', releaseDir: first },
    { courseId: secondId, title: 'Second course', releaseDir: second },
  ]);
}

function rows(table: string): number {
  return (db?.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
}

/** Every content table, so "nothing of it was stored" means nothing, not just no release row. */
function storedCounts() {
  return {
    releases: rows('content_release'),
    lessons: rows('content_lesson'),
    kits: rows('content_lab_kit'),
    activitySets: rows('content_activity_set'),
  };
}

const oneCourseStored = { releases: 1, lessons: 2, kits: 1, activitySets: 1 };

function failureOf(course: CourseState | undefined) {
  if (course?.release.state !== 'failed') {
    throw new Error(`Expected ${course?.courseId} to be refused; it was ${course?.release.state}.`);
  }
  return course.release.failure;
}

describe('importing several courses', () => {
  it('imports each course from its own release, in config order, keeping id and title', () => {
    const courses = importBoth(
      release({ releasePrefix: 'FIX' }),
      release({ releasePrefix: 'QAX' }),
    );

    expect(courses.map((course) => [course.courseId, course.title, course.release.state])).toEqual([
      ['FIX', 'Fixture course', 'imported'],
      ['QAX', 'Second course', 'imported'],
    ]);
    expect(storedCounts()).toEqual({ releases: 2, lessons: 4, kits: 2, activitySets: 2 });
  });

  it('refuses only the course whose release is missing, and still imports the other (C2)', () => {
    const missing = path.join(makeTempDir(), 'not-there');
    tempDirs.push(path.dirname(missing));

    const courses = importBoth(missing, release({ releasePrefix: 'QAX' }));

    expect(failureOf(courses[0]).code).toBe('manifest_missing');
    expect(courses[1]?.release.state).toBe('imported');
  });

  it('refuses a course pointed at a release that names another course (C3)', () => {
    const courses = importBoth(
      release({ releasePrefix: 'FIX' }),
      release({ releasePrefix: 'FIX' }),
      'QAX',
    );

    const failure = failureOf(courses[1]);
    expect(failure.code).toBe('release_course_mismatch');
    expect(failure.message).toContain('QAX');
    expect(failure.message).toContain('FIX-RELEASE');
    expect(courses[0]?.release.state).toBe('imported');
  });

  it('treats a release id that shares the letters but not the dash as another course’s', () => {
    const courses = importBoth(
      release({ releasePrefix: 'FIX' }),
      release({ releasePrefix: 'QAXTRA' }),
      'QAX',
    );

    expect(failureOf(courses[1]).code).toBe('release_course_mismatch');
  });
});

describe('one id, one meaning, across courses (C4)', () => {
  it('refuses a later course that reuses an activity id for a different lesson, storing nothing of it', () => {
    const courses = importBoth(
      release({
        releasePrefix: 'FIX',
        activities: [{ activity_id: 'ACT-SAME', lesson_id: 'FIX-LS-01' }],
      }),
      release({
        releasePrefix: 'QAX',
        activities: [{ activity_id: 'ACT-SAME', lesson_id: 'QAX-LS-01' }],
      }),
    );

    const failure = failureOf(courses[1]);
    expect(failure.code).toBe('activity_id_collision');
    expect(failure.message).toContain('ACT-SAME');
    expect(failure.message).toContain('FIX-LS-01');
    expect(failure.message).toContain('QAX-LS-01');
    expect(courses[0]?.release.state).toBe('imported');
    expect(storedCounts()).toEqual(oneCourseStored);
  });

  it('refuses a later course that reuses a lesson id for a different document, storing nothing of it', () => {
    const courses = importBoth(
      release({ releasePrefix: 'FIX' }),
      release({
        releasePrefix: 'QAX',
        lessons: [
          { lessonId: 'FIX-LS-01', documentId: 'QAX-DOC-01' },
          { lessonId: 'QAX-LS-02', documentId: 'QAX-DOC-02' },
        ],
      }),
    );

    const failure = failureOf(courses[1]);
    expect(failure.code).toBe('lesson_id_collision');
    expect(failure.message).toContain('FIX-LS-01');
    expect(failure.message).toContain('FIX-DOC-01');
    expect(failure.message).toContain('QAX-DOC-01');
    expect(storedCounts()).toEqual(oneCourseStored);
  });

  it('accepts a shared lesson: the same lesson and document, the same activity for the same lesson', () => {
    const shared = { activity_id: 'ACT-SHARED', lesson_id: 'FIX-LS-01' };
    const courses = importBoth(
      release({ releasePrefix: 'FIX', activities: [shared] }),
      release({
        releasePrefix: 'QAX',
        lessons: [
          { lessonId: 'FIX-LS-01', documentId: 'FIX-DOC-01' },
          { lessonId: 'QAX-LS-02', documentId: 'QAX-DOC-02' },
        ],
        activities: [shared],
      }),
    );

    expect(courses.map((course) => course.release.state)).toEqual(['imported', 'imported']);
  });

  it('checks a course only against courses that imported, so a refused course claims no ids', () => {
    // FIX is refused for a missing lesson file, so its ids were never stored. QAX reusing one of
    // them for something else contradicts nothing the app serves.
    const broken = release({
      releasePrefix: 'FIX',
      activities: [{ activity_id: 'ACT-SAME', lesson_id: 'FIX-LS-01' }],
    });
    removeDir(path.join(broken, 'lessons'));

    const courses = importBoth(
      broken,
      release({
        releasePrefix: 'QAX',
        activities: [{ activity_id: 'ACT-SAME', lesson_id: 'QAX-LS-01' }],
      }),
    );

    expect(courses[0]?.release.state).toBe('failed');
    expect(courses[1]?.release.state).toBe('imported');
  });
});

describe('one id, one meaning, across restarts (code review, 2026-11-03)', () => {
  it('refuses a course reusing an id a stored release of another course gives another meaning, whatever the config order', () => {
    db = openDatabase(':memory:');
    const qax = release({
      releasePrefix: 'QAX',
      activities: [{ activity_id: 'ACT-SAME', lesson_id: 'QAX-LS-01' }],
    });
    // An earlier start where only QAX imported, so its ids, and any answers under them, are stored.
    importCourses(db, [{ courseId: 'QAX', title: 'Second course', releaseDir: qax }]);

    const courses = importCourses(db, [
      {
        courseId: 'FIX',
        title: 'Fixture course',
        releaseDir: release({
          releasePrefix: 'FIX',
          activities: [{ activity_id: 'ACT-SAME', lesson_id: 'FIX-LS-01' }],
        }),
      },
      { courseId: 'QAX', title: 'Second course', releaseDir: qax },
    ]);

    expect(failureOf(courses[0]).code).toBe('activity_id_collision');
    expect(failureOf(courses[0]).message).toContain('QAX-LS-01');
    expect(courses[1]?.release.state).toBe('imported');
  });

  it('does not hold a course against its own earlier releases', () => {
    db = openDatabase(':memory:');
    const config = (dir: string) => [{ courseId: 'FIX', title: 'Fixture course', releaseDir: dir }];
    importCourses(
      db,
      config(
        release({
          releasePrefix: 'FIX',
          activities: [{ activity_id: 'ACT-MOVED', lesson_id: 'FIX-LS-01' }],
        }),
      ),
    );

    const later = importCourses(
      db,
      config(
        release({
          releasePrefix: 'FIX',
          activities: [{ activity_id: 'ACT-MOVED', lesson_id: 'FIX-LS-02' }],
        }),
      ),
    );

    expect(later[0]?.release.state).toBe('imported');
  });
});

describe('the course list itself (code review, 2026-11-03)', () => {
  it.each([
    ['a repeated id', ['FIX', 'FIX']],
    ['an id that is not safe in an address', ['FIX', 'QA X']],
  ])('refuses to start with %s, rather than registering routes nobody can reach', (_case, ids) => {
    db = openDatabase(':memory:');
    const dir = release({ releasePrefix: 'FIX' });

    expect(() =>
      importCourses(
        db as Db,
        ids.map((courseId) => ({ courseId, title: courseId, releaseDir: dir })),
      ),
    ).toThrow(/course/i);
  });
});
