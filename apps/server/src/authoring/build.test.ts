import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyRelease } from '../modules/content/verify.js';
import { buildRelease, type ReleaseChanges } from './build.js';
import { readZip } from './zip.js';
import {
  REAL_CONTENT,
  cleanTemps,
  editReleaseJson,
  kitFolder,
  lessonFile,
  listFiles,
  replaceInFile,
  seededSource,
  setActivityLessonVersion,
  setKitVersion,
  setLessonVersion,
  sha256,
  tempDir,
} from './testkit/sourceFixture.js';

afterEach(cleanTemps);

const LESSON_5 = 'HTTP_Lesson_05_Student_Edition_v1.md';
const LESSON_2 = 'HTTP_Lesson_02_Student_Edition_v1.md';
const KIT_03_05 = 'HTTP_Lessons_03_05_Local_Kit_v1';
const KIT_02 = 'HTTP_Lesson_02_Local_Server_Kit_v1';
const KIT_06_08 = 'HTTP_Lessons_06_08_Local_Kit_v1';
const LESSON_5_LINE = 'Today you will watch that happen.';

/** The correction C12 describes: one line of Lesson 5, with every version that must move. */
function correctLesson5(source: string): void {
  replaceInFile(lessonFile(source, LESSON_5), LESSON_5_LINE, 'Today you will watch it happen.');
  setLessonVersion(source, LESSON_5, '1.0.1-draft');
  setActivityLessonVersion(source, 'LS-M020-05', '1.0.1-draft');
  setKitVersion(source, KIT_03_05, '1.0.1-draft');
  editReleaseJson(source, (release) => {
    release.release.version = '1.0.2-draft';
  });
}

const output = () => path.join(tempDir(), 'http-first-fifteen-v1_0_2');
const readJson = <T>(file: string) => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

interface ReleaseManifest {
  version: string;
  lessons: { lesson_id: string; version: string; title: string; path: string; sha256: string }[];
  lab_downloads: { lab_id: string; version: string; path: string; sha256: string }[];
}

function refusedWith(outcome: ReturnType<typeof buildRelease>, pattern: RegExp): void {
  expect(outcome.state).toBe('refused');
  if (outcome.state === 'refused') expect(outcome.reason).toMatch(pattern);
}

describe('a correction reissue built from the source tree (C3, C4, C9, C12)', () => {
  it('is accepted by the importer and changes exactly the corrected bytes', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = output();

    const outcome = buildRelease(source, out);
    expect(outcome.state).toBe('built');

    const verified = verifyRelease(path.join(out, 'content'));
    expect(verified.state).toBe('verified');
    if (verified.state !== 'verified') return;
    expect(verified.release.version).toBe('1.0.2-draft');

    const before = readJson<ReleaseManifest>(path.join(REAL_CONTENT, 'learning-release.json'));
    const after = readJson<ReleaseManifest>(path.join(out, 'content/learning-release.json'));
    const unchangedLessons = after.lessons.filter((lesson) => lesson.lesson_id !== 'LS-M020-05');
    expect(unchangedLessons).toHaveLength(14);
    for (const lesson of unchangedLessons) {
      const previous = before.lessons.find((entry) => entry.lesson_id === lesson.lesson_id)!;
      expect(lesson, lesson.lesson_id).toEqual(previous);
    }

    const lesson5 = after.lessons.find((lesson) => lesson.lesson_id === 'LS-M020-05')!;
    const lesson5Bytes = fs.readFileSync(path.join(out, 'content', lesson5.path));
    expect(lesson5.version).toBe('1.0.1-draft');
    expect(lesson5.title).toBe('Lesson 5: One page can make several requests');
    expect(lesson5.sha256).toBe(sha256(lesson5Bytes));
    expect(lesson5Bytes.toString('utf8')).toContain('Today you will watch it happen.');

    for (const lab of after.lab_downloads.filter(
      (entry) => entry.lab_id !== 'FSSE-HTTP-LAB-03-05',
    )) {
      const previous = before.lab_downloads.find((entry) => entry.lab_id === lab.lab_id)!;
      expect(lab, lab.lab_id).toEqual(previous);
      const bytes = fs.readFileSync(path.join(out, 'content', lab.path));
      expect(
        bytes.equals(fs.readFileSync(path.join(REAL_CONTENT, previous.path))),
        lab.lab_id,
      ).toBe(true);
    }
  });

  it('repacks the corrected kit with the new lesson copy and only that manifest hash moved', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = output();
    expect(buildRelease(source, out).state).toBe('built');

    const kitPath = `labs/${KIT_03_05}.zip`;
    const before = readZip(fs.readFileSync(path.join(REAL_CONTENT, kitPath)));
    const after = readZip(fs.readFileSync(path.join(out, 'content', kitPath)));
    expect(after.map((member) => member.path)).toEqual(before.map((member) => member.path));

    const canonical = fs.readFileSync(path.join(out, 'content/lessons', LESSON_5));
    const changedPaths: string[] = [];
    after.forEach((member, index) => {
      if (!member.bytes.equals(before[index]!.bytes)) changedPaths.push(member.path);
    });
    expect(changedPaths.sort()).toEqual(
      [`http-lessons-03-05-lab/${LESSON_5}`, 'http-lessons-03-05-lab/manifest.json'].sort(),
    );
    expect(after.find((member) => member.path.endsWith(LESSON_5))!.bytes.equals(canonical)).toBe(
      true,
    );

    type KitManifest = { version: string; files: { path: string; sha256: string }[] };
    const manifestOf = (members: typeof after) =>
      JSON.parse(
        members.find((member) => member.path.endsWith('/manifest.json'))!.bytes.toString('utf8'),
      ) as KitManifest;
    const oldManifest = manifestOf(before);
    const newManifest = manifestOf(after);
    expect(newManifest.version).toBe('1.0.1-draft');
    expect(newManifest.files).toEqual(
      oldManifest.files.map((file) =>
        file.path === LESSON_5 ? { ...file, sha256: sha256(canonical) } : file,
      ),
    );
  });

  it('records every lesson, kit and the activity file with its version and hash transition', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.accepted_feedback = ['CF-003'];
    });
    const out = output();
    const outcome = buildRelease(source, out);
    expect(outcome.state).toBe('built');
    if (outcome.state !== 'built') return;

    const written = readJson<ReleaseChanges>(path.join(out, 'release-changes.json'));
    expect(written).toEqual(outcome.changes);

    const changes = outcome.changes;
    expect(changes.previous_version).toBe('1.0.1-draft');
    expect(changes.version).toBe('1.0.2-draft');
    expect(changes.accepted_feedback).toEqual(['CF-003']);
    expect(changes.lessons).toHaveLength(15);
    expect(changes.lessons.filter((lesson) => lesson.status === 'changed')).toEqual([
      expect.objectContaining({
        lesson_id: 'LS-M020-05',
        previous_version: '1.0.0-draft',
        version: '1.0.1-draft',
        previous_sha256: sha256(fs.readFileSync(path.join(REAL_CONTENT, 'lessons', LESSON_5))),
        sha256: sha256(fs.readFileSync(path.join(out, 'content/lessons', LESSON_5))),
      }),
    ]);
    expect(changes.labs).toHaveLength(5);
    expect(changes.labs.filter((lab) => lab.status === 'changed')).toEqual([
      expect.objectContaining({
        lab_id: 'FSSE-HTTP-LAB-03-05',
        previous_version: '1.0.0-draft',
        version: '1.0.1-draft',
      }),
    ]);
    expect(changes.activities.status).toBe('changed');
    const unchanged = changes.lessons.find((lesson) => lesson.lesson_id === 'LS-M020-01')!;
    expect(unchanged.status).toBe('unchanged');
    expect(unchanged.sha256).toBe(unchanged.previous_sha256);
  });

  it('lists every file of the package in package-manifest.json with its real hash', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = output();
    expect(buildRelease(source, out).state).toBe('built');

    const manifest = readJson<{ version: string; files: { path: string; sha256: string }[] }>(
      path.join(out, 'package-manifest.json'),
    );
    expect(manifest.version).toBe('1.0.2-draft');
    const listed = manifest.files.map((file) => file.path).sort();
    expect(listed).toEqual(listFiles(out).filter((file) => file !== 'package-manifest.json'));
    expect(listed).toContain('release-changes.json');
    expect(listed).toContain('START_HERE.md');
    for (const file of manifest.files) {
      expect(sha256(fs.readFileSync(path.join(out, file.path))), file.path).toBe(file.sha256);
    }
  });

  it('records what it checked and names the checks it did not run (C11)', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = output();
    expect(buildRelease(source, out).state).toBe('built');

    const record = readJson<{ importer_verification: string; not_run_by_this_tool: string[] }>(
      path.join(out, 'package-verification.json'),
    );
    expect(record.importer_verification).toBe('passed');
    expect(record.not_run_by_this_tool).toEqual(
      expect.arrayContaining([
        'mermaid_parse_and_render',
        'browser_rehearsal',
        'kit_runtime_suites',
      ]),
    );
  });
});

describe('kits (C5, C6)', () => {
  it('repacks a changed kit identically every time', () => {
    const source = seededSource();
    correctLesson5(source);
    const first = output();
    const second = output();
    expect(buildRelease(source, first).state).toBe('built');
    expect(buildRelease(source, second).state).toBe('built');
    const kit = `content/labs/${KIT_03_05}.zip`;
    expect(
      fs.readFileSync(path.join(first, kit)).equals(fs.readFileSync(path.join(second, kit))),
    ).toBe(true);
  });

  it('updates bytes as well as hash in a kit manifest that records bytes', () => {
    const source = seededSource();
    replaceInFile(
      lessonFile(source, LESSON_2),
      '# Lesson 2: Give the browser an address—and something to answer',
      '# Lesson 2: Give the browser an address—and something to answer it',
    );
    setLessonVersion(source, LESSON_2, '1.0.2-draft');
    setActivityLessonVersion(source, 'LS-M020-02', '1.0.2-draft');
    setKitVersion(source, KIT_02, '1.0.2-draft');
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    const out = output();
    expect(buildRelease(source, out).state).toBe('built');

    const members = readZip(fs.readFileSync(path.join(out, 'content/labs', `${KIT_02}.zip`)));
    const manifest = JSON.parse(
      members.find((member) => member.path.endsWith('/manifest.json'))!.bytes.toString('utf8'),
    ) as { kit_version: string; files: { path: string; bytes: number; sha256: string }[] };
    const canonical = fs.readFileSync(path.join(out, 'content/lessons', LESSON_2));
    expect(manifest.kit_version).toBe('1.0.2-draft');
    expect(manifest.files.find((file) => file.path === LESSON_2)).toEqual({
      path: LESSON_2,
      bytes: canonical.byteLength,
      sha256: sha256(canonical),
    });
  });

  it('builds a kit-only change once the kit version moves', () => {
    const source = seededSource();
    fs.appendFileSync(path.join(kitFolder(source, KIT_06_08), 'README.md'), '\nOne more note.\n');
    setKitVersion(source, KIT_06_08, '1.0.2-draft');
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    const out = output();
    const outcome = buildRelease(source, out);
    expect(outcome.state).toBe('built');
    if (outcome.state === 'built') {
      expect(
        outcome.changes.labs.filter((lab) => lab.status === 'changed').map((lab) => lab.lab_id),
      ).toEqual(['FSSE-HTTP-LAB-06-08']);
      expect(outcome.changes.lessons.every((lesson) => lesson.status === 'unchanged')).toBe(true);
    }
  });
});

describe('the build refuses (C3, C7, C8, C10, scope fence)', () => {
  it('refuses a changed lesson whose version did not move, naming the lesson and version', () => {
    const source = seededSource();
    correctLesson5(source);
    setLessonVersion(source, LESSON_5, '1.0.0-draft');
    setActivityLessonVersion(source, 'LS-M020-05', '1.0.0-draft');
    refusedWith(
      buildRelease(source, output()),
      /HTTP_Lesson_05.*1\.0\.0-draft|1\.0\.0-draft.*HTTP_Lesson_05/s,
    );
  });

  it('refuses a changed kit whose version did not move, naming the kit', () => {
    const source = seededSource();
    correctLesson5(source);
    setKitVersion(source, KIT_03_05, '1.0.0-draft');
    refusedWith(
      buildRelease(source, output()),
      /HTTP_Lessons_03_05_Local_Kit_v1|FSSE-HTTP-LAB-03-05/,
    );
  });

  it('refuses a release whose version did not move', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.1-draft';
    });
    refusedWith(buildRelease(source, output()), /1\.0\.1-draft/);
  });

  it('refuses an activity still pointing at the old lesson version, naming it', () => {
    const source = seededSource();
    correctLesson5(source);
    setActivityLessonVersion(source, 'LS-M020-05', '1.0.0-draft');
    refusedWith(buildRelease(source, output()), /ACT-M020-05-\d\d.*1\.0\.1-draft/s);
  });

  it('refuses a build in which no lesson, kit or activity byte changed', () => {
    const source = seededSource();
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    const out = output();
    refusedWith(buildRelease(source, out), /nothing/i);
    expect(fs.existsSync(out)).toBe(false);
  });

  it('refuses an existing output directory and leaves it untouched', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = output();
    fs.mkdirSync(out);
    fs.writeFileSync(path.join(out, 'keep.txt'), 'mine');
    refusedWith(buildRelease(source, out), /exists/i);
    expect(listFiles(out)).toEqual(['keep.txt']);
  });

  it('leaves no output directory behind when it refuses', () => {
    const source = seededSource();
    correctLesson5(source);
    setActivityLessonVersion(source, 'LS-M020-05', '1.0.0-draft');
    const out = output();
    expect(buildRelease(source, out).state).toBe('refused');
    expect(fs.existsSync(out)).toBe(false);
    expect(fs.readdirSync(path.dirname(out))).toEqual([]);
  });

  it('refuses adding a lesson, which this slice does not support', () => {
    const source = seededSource();
    correctLesson5(source);
    fs.copyFileSync(lessonFile(source, LESSON_5), lessonFile(source, 'HTTP_Lesson_16_Draft.md'));
    editReleaseJson(source, (release) => {
      release.lessons.push('HTTP_Lesson_16_Draft.md');
    });
    refusedWith(
      buildRelease(source, output()),
      /HTTP_Lesson_16_Draft\.md.*not supported|not supported.*HTTP_Lesson_16_Draft\.md/s,
    );
  });

  it('refuses removing a kit, which this slice does not support', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.labs = release.labs.filter((lab) => lab.lab_id !== 'FSSE-HTTP-LAB-14-15');
    });
    refusedWith(buildRelease(source, output()), /FSSE-HTTP-LAB-14-15/);
  });
});
