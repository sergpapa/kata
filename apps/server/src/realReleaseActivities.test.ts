import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { testCourse } from './modules/content/testkit/courseFixture.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';

/**
 * Criterion I6 in docs/specs/activity-placement.md, against the author's own release. A fixture
 * proves the contract; only the real file proves the contract covers what the author shipped.
 *
 * `lesson_version` is deliberately checked here and nowhere in the running app: a version-string
 * slip in one activity record would otherwise refuse all fifteen lessons, and nothing the reader
 * sees depends on the field. A local test run is the right place for that to fail.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const releaseDir = path.join(
  repoRoot,
  'content',
  'releases',
  'http-first-fifteen-v1_0_1',
  'content',
);

interface ManifestLesson {
  lesson_id: string;
  version: string;
  path: string;
}

interface ActivityRecord {
  activity_id: string;
  lesson_id: string;
  lesson_version: string;
  source_heading: string;
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(releaseDir, 'learning-release.json'), 'utf8'),
) as { lessons: ManifestLesson[] };

const activityFile = JSON.parse(
  fs.readFileSync(path.join(releaseDir, 'trial-activities.json'), 'utf8'),
) as { activities: ActivityRecord[] };

let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
});

async function servedActivities(candidateLessonId: string) {
  db = openDatabase(':memory:');
  const app = buildApp({
    db,
    courses: [testCourse('FSSE', releaseDir, importRelease(db, releaseDir))],
  });
  const response = await app.inject({
    method: 'GET',
    url: `/api/courses/FSSE/lessons/${candidateLessonId}`,
  });
  const body = response.json() as { activities: { activityId: string; sourceHeading: string }[] };
  await app.close();
  return body.activities;
}

describe('the forty-five authored activities', () => {
  it('imports the release with its activity file read', () => {
    db = openDatabase(':memory:');
    const state = importRelease(db, releaseDir);

    expect(state.state, state.state === 'failed' ? state.failure.message : '').toBe('imported');
  });

  it('carries forty-five activities with distinct ids', () => {
    expect(activityFile.activities).toHaveLength(45);
    expect(new Set(activityFile.activities.map((a) => a.activity_id)).size).toBe(45);
  });

  it('gives every one of the fifteen lessons three of them', () => {
    const perLesson = new Map<string, number>();
    for (const activity of activityFile.activities) {
      perLesson.set(activity.lesson_id, (perLesson.get(activity.lesson_id) ?? 0) + 1);
    }

    expect(perLesson.size).toBe(15);
    expect([...perLesson.values()]).toEqual(Array<number>(15).fill(3));
  });

  it('names a lesson version matching the manifest on every activity', () => {
    const versionOf = new Map(manifest.lessons.map((lesson) => [lesson.lesson_id, lesson.version]));

    for (const activity of activityFile.activities) {
      expect(
        versionOf.get(activity.lesson_id),
        `${activity.activity_id} names lesson version ${activity.lesson_version}`,
      ).toBe(activity.lesson_version);
    }
  });

  it('names a heading that appears exactly once in its own lesson', () => {
    const bodyOf = new Map(
      manifest.lessons.map((lesson) => [
        lesson.lesson_id,
        fs.readFileSync(path.join(releaseDir, lesson.path), 'utf8'),
      ]),
    );

    for (const activity of activityFile.activities) {
      const source = bodyOf.get(activity.lesson_id) as string;
      const headings = [...source.matchAll(/^#{1,6}[ \t]+(.*)$/gm)].map((match) => match[1].trim());
      const hits = headings.filter((heading) => heading === activity.source_heading);

      expect(hits, `${activity.activity_id} asks for "${activity.source_heading}"`).toHaveLength(1);
    }
  });

  it('serves each lesson its own three, in the file’s order', async () => {
    for (const lesson of manifest.lessons.slice(0, 3)) {
      const expected = activityFile.activities
        .filter((activity) => activity.lesson_id === lesson.lesson_id)
        .map((activity) => activity.activity_id);

      const served = await servedActivities(lesson.lesson_id);

      expect(served.map((activity) => activity.activityId)).toEqual(expected);
    }
  });
});
