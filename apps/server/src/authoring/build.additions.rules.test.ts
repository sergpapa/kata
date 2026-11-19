/**
 * Criteria A2 (an existing kit gaining a lesson), A3–A5 in docs/specs/release-additions.md: the
 * version and something-to-release rules, as they apply beside an addition.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildRelease } from './build.js';
import { readZip } from './zip.js';
import {
  KIT_06_08,
  LESSON_5,
  NEW_LESSON,
  NEW_LESSON_ID,
  REAL_CONTENT,
  addKit,
  addLesson,
  cleanTemps,
  correctLesson5,
  editReleaseJson,
  kitFolder,
  lessonFile,
  moveReleaseVersion,
  outputPath,
  replaceInFile,
  seededSource,
  setKitVersion,
  sha256,
} from './testkit/sourceFixture.js';
import { expectRefusal } from './testkit/buildAssertions.js';

afterEach(cleanTemps);

describe('an existing kit that starts serving an added lesson (A2, C7)', () => {
  it('is refused while its version has not moved', () => {
    const source = seededSource();
    addLesson(source);
    editReleaseJson(source, (release) => {
      release.labs
        .find((lab) => lab.lab_id === 'FSSE-HTTP-LAB-06-08')!
        .lesson_ids.push(NEW_LESSON_ID);
    });
    moveReleaseVersion(source);
    expectRefusal(source, /FSSE-HTTP-LAB-06-08|HTTP_Lessons_06_08_Local_Kit_v1/, /1\.0\.1-draft/);
  });

  it('is repacked as changed, carrying the new lesson, once its version moves', () => {
    const source = seededSource();
    addLesson(source);
    editReleaseJson(source, (release) => {
      release.labs
        .find((lab) => lab.lab_id === 'FSSE-HTTP-LAB-06-08')!
        .lesson_ids.push(NEW_LESSON_ID);
    });
    setKitVersion(source, 'HTTP_Lessons_06_08_Local_Kit_v1', '1.0.2-draft');
    moveReleaseVersion(source);
    const out = outputPath();
    const outcome = buildRelease(source, out);
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
    if (outcome.state !== 'built') return;

    expect(outcome.changes.labs.find((lab) => lab.lab_id === 'FSSE-HTTP-LAB-06-08')).toMatchObject({
      status: 'changed',
      previous_version: '1.0.1-draft',
      version: '1.0.2-draft',
    });
    const zip = fs.readFileSync(path.join(out, 'content/labs/HTTP_Lessons_06_08_Local_Kit_v1.zip'));
    expect(readZip(zip).some((member) => member.path.endsWith(`/${NEW_LESSON}`))).toBe(true);
  });
});

describe('versions are checked only where there is a previous version (A3, A4)', () => {
  it('still refuses a changed existing lesson whose version did not move, beside an addition', () => {
    const source = seededSource();
    addLesson(source);
    replaceInFile(
      lessonFile(source, LESSON_5),
      'Today you will watch that happen.',
      'Today you will watch it happen.',
    );
    moveReleaseVersion(source);
    expectRefusal(source, /HTTP_Lesson_05_Student_Edition_v1\.md/, /1\.0\.0-draft/);
  });

  it('still refuses a changed existing kit whose version did not move, beside an added kit', () => {
    const source = seededSource();
    addLesson(source);
    addKit(source, [NEW_LESSON_ID]);
    fs.appendFileSync(path.join(kitFolder(source, KIT_06_08), 'README.md'), '\nOne more note.\n');
    moveReleaseVersion(source);
    expectRefusal(source, /FSSE-HTTP-LAB-06-08|HTTP_Lessons_06_08_Local_Kit_v1/, /1\.0\.1-draft/);
  });

  it('records a corrected lesson as changed and an added one as added, in one build', () => {
    const source = seededSource();
    correctLesson5(source);
    addLesson(source);
    moveReleaseVersion(source);
    const outcome = buildRelease(source, outputPath());
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
    if (outcome.state !== 'built') return;

    expect(
      outcome.changes.lessons.find((lesson) => lesson.lesson_id === 'LS-M020-05'),
    ).toMatchObject({
      status: 'changed',
      previous_version: '1.0.0-draft',
      version: '1.0.1-draft',
      previous_sha256: sha256(fs.readFileSync(path.join(REAL_CONTENT, 'lessons', LESSON_5))),
    });
    expect(
      outcome.changes.lessons.find((lesson) => lesson.lesson_id === NEW_LESSON_ID),
    ).toMatchObject({
      status: 'added',
      previous_version: null,
      previous_sha256: null,
    });
  });
});

describe('an addition is something to release (A5)', () => {
  it('builds when the only difference is an added lesson', () => {
    const source = seededSource();
    addLesson(source);
    moveReleaseVersion(source);
    const outcome = buildRelease(source, outputPath());
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
  });

  it('builds when the only difference is an added kit', () => {
    const source = seededSource();
    addKit(source, ['LS-M020-01']);
    moveReleaseVersion(source);
    const outcome = buildRelease(source, outputPath());
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
    if (outcome.state !== 'built') return;
    expect(outcome.changes.lessons.every((lesson) => lesson.status === 'unchanged')).toBe(true);
  });

  it('still refuses an addition that did not move the release version', () => {
    const source = seededSource();
    addLesson(source);
    expectRefusal(source, /1\.0\.1-draft/, /release/i);
  });
});
