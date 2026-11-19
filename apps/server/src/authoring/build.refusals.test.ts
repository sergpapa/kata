import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildRelease } from './build.js';
import {
  KIT_03_05,
  KIT_06_08,
  LESSON_5,
  cleanTemps,
  correctLesson5,
  editReleaseJson,
  kitFolder,
  listFiles,
  outputPath,
  seededSource,
  setActivityLessonVersion,
  setKitVersion,
  setLessonVersion,
} from './testkit/sourceFixture.js';

afterEach(cleanTemps);

/** Builds, expects a refusal whose reason matches every pattern, and expects no output at all. */
function expectRefusal(source: string, ...patterns: RegExp[]): void {
  const out = outputPath();
  const outcome = buildRelease(source, out);
  expect(outcome.state).toBe('refused');
  if (outcome.state === 'refused') {
    for (const pattern of patterns) expect(outcome.reason).toMatch(pattern);
  }
  expect(fs.readdirSync(path.dirname(out))).toEqual([]);
}

describe('versions must move with bytes (C7)', () => {
  it('refuses a changed lesson whose version did not move', () => {
    const source = seededSource();
    correctLesson5(source);
    setLessonVersion(source, LESSON_5, '1.0.0-draft');
    setActivityLessonVersion(source, 'LS-M020-05', '1.0.0-draft');
    expectRefusal(source, /HTTP_Lesson_05_Student_Edition_v1\.md/, /1\.0\.0-draft/);
  });

  it('refuses a kit changed through its lesson copy whose version did not move', () => {
    const source = seededSource();
    correctLesson5(source);
    setKitVersion(source, KIT_03_05, '1.0.0-draft');
    expectRefusal(source, /FSSE-HTTP-LAB-03-05|HTTP_Lessons_03_05_Local_Kit_v1/, /1\.0\.0-draft/);
  });

  it('refuses a kit changed through an authored file whose version did not move', () => {
    const source = seededSource();
    fs.appendFileSync(path.join(kitFolder(source, KIT_06_08), 'README.md'), '\nOne more note.\n');
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    expectRefusal(source, /FSSE-HTTP-LAB-06-08|HTTP_Lessons_06_08_Local_Kit_v1/, /1\.0\.1-draft/);
  });

  it('refuses a release whose own version did not move', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.1-draft';
    });
    expectRefusal(source, /release/i, /1\.0\.1-draft/);
  });
});

describe('activities must follow their lessons (C8)', () => {
  it('refuses an activity still pointing at the old lesson version, naming it and the expected one', () => {
    const source = seededSource();
    correctLesson5(source);
    setActivityLessonVersion(source, 'LS-M020-05', '1.0.0-draft');
    expectRefusal(source, /ACT-M020-05-0\d/, /1\.0\.1-draft/);
  });
});

describe('nothing to release, and the output directory (C3, C11)', () => {
  it('refuses a build in which no lesson, kit or activity byte changed', () => {
    const source = seededSource();
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    expectRefusal(source, /nothing/i);
  });

  it('refuses an existing output directory and leaves it exactly as it was', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = outputPath();
    fs.mkdirSync(out);
    fs.writeFileSync(path.join(out, 'keep.txt'), 'mine');
    const outcome = buildRelease(source, out);
    expect(outcome.state).toBe('refused');
    if (outcome.state === 'refused') expect(outcome.reason).toMatch(/exists/i);
    expect(listFiles(out)).toEqual(['keep.txt']);
    expect(fs.readFileSync(path.join(out, 'keep.txt'), 'utf8')).toBe('mine');
  });
});

describe('removing lessons and kits is refused (scope fence; adding is docs/specs/release-additions.md)', () => {
  it('refuses a removed lesson, naming it', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.lessons = release.lessons.filter(
        (lesson) => lesson !== 'HTTP_Lesson_15_Student_Edition_v1.md',
      );
      release.labs = release.labs.map((lab) => ({
        ...lab,
        lesson_ids: lab.lesson_ids.filter((id) => id !== 'LS-M021-07'),
      }));
    });
    expectRefusal(source, /HTTP_Lesson_15_Student_Edition_v1\.md|LS-M021-07/);
  });

  it('refuses a removed kit, naming it', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.labs = release.labs.filter((lab) => lab.lab_id !== 'FSSE-HTTP-LAB-14-15');
    });
    expectRefusal(source, /FSSE-HTTP-LAB-14-15/);
  });
});
