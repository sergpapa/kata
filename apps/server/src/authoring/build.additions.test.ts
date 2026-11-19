/**
 * Criteria A1–A8 in docs/specs/release-additions.md: a build that adds a lesson and a kit to the
 * real full-stack release, and the rules that still hold around it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { verifyRelease } from '../modules/content/verify.js';
import { buildRelease, type BuildOutcome, type ReleaseChanges } from './build.js';
import { readZip } from './zip.js';
import {
  CORRECTION_DATE,
  NEW_KIT,
  NEW_KIT_FOLDER,
  NEW_KIT_ID,
  NEW_LESSON,
  NEW_LESSON_ID,
  REAL_CONTENT,
  addActivity,
  addKit,
  addLesson,
  LESSON_1,
  cleanTemps,
  lessonFile,
  listFiles,
  moveReleaseVersion,
  outputPath,
  readJson,
  seededSource,
  sha256,
  tempDir,
} from './testkit/sourceFixture.js';
import { built, kitZip } from './testkit/buildAssertions.js';

afterEach(() => {
  vi.useRealTimers();
  cleanTemps();
});

interface LessonEntry {
  order: number;
  lesson_id: string;
  document_id: string;
  version: string;
  module: string;
  title: string;
  path: string;
  sha256: string;
  lab_id: string | null;
}
interface ReleaseManifest {
  lessons: LessonEntry[];
  lab_downloads: {
    lab_id: string;
    version: string;
    path: string;
    sha256: string;
    lesson_ids: string[];
  }[];
}
type KitManifest = Record<string, unknown> & { files: { path: string; sha256: string }[] };

let shared: { source: string; out: string; outcome: BuildOutcome } | undefined;
let sharedParent: string | undefined;

/**
 * Lesson 16, one activity for it, and a new kit serving it, added to the real 1.0.1 release.
 * Built once for the file: the tests that use it only read the output.
 */
function releaseWithAdditions(): { source: string; out: string; outcome: BuildOutcome } {
  if (shared === undefined) {
    sharedParent = fs.mkdtempSync(path.join(os.tmpdir(), 'educode-additions-shared-'));
    const source = seededSource(sharedParent);
    addLesson(source);
    addActivity(source);
    addKit(source, [NEW_LESSON_ID]);
    moveReleaseVersion(source);
    const out = outputPath(sharedParent);
    shared = { source, out, outcome: buildRelease(source, out) };
  }
  return shared;
}

afterAll(() => {
  if (sharedParent !== undefined) fs.rmSync(sharedParent, { recursive: true, force: true });
});

describe('a lesson can be added (A1)', () => {
  it('builds a release the importer accepts, with the new lesson derived from its own file', () => {
    const { out, outcome } = releaseWithAdditions();
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');

    expect(verifyRelease(path.join(out, 'content')).state).toBe('verified');
    const manifest = readJson<ReleaseManifest>(path.join(out, 'content/learning-release.json'));
    expect(manifest.lessons).toHaveLength(16);
    const added = manifest.lessons.find((lesson) => lesson.lesson_id === NEW_LESSON_ID);
    expect(added).toEqual({
      order: 16,
      lesson_id: NEW_LESSON_ID,
      document_id: 'FSSE-HTTP-STUDENT-16',
      version: '1.0.0-draft',
      module: 'M021',
      title: 'Lesson 16: Review, justified disagreement, revision',
      path: `lessons/${NEW_LESSON}`,
      sha256: sha256(fs.readFileSync(path.join(out, 'content/lessons', NEW_LESSON))),
      lab_id: NEW_KIT_ID,
    });
  });

  it('ships the new lesson and its activity byte for byte', () => {
    const { source, out } = releaseWithAdditions();
    for (const file of [`lessons/${NEW_LESSON}`, 'trial-activities.json']) {
      expect(
        fs
          .readFileSync(path.join(out, 'content', file))
          .equals(fs.readFileSync(path.join(source, file))),
        file,
      ).toBe(true);
    }
  });

  it.each([
    ['before the existing ones', 0],
    ['between two existing ones', 7],
  ])('accepts a lesson added %s, renumbering order with no status changing', (_where, position) => {
    const source = seededSource();
    addLesson(source, { position });
    moveReleaseVersion(source);
    const out = outputPath();
    const outcome = buildRelease(source, out);
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
    if (outcome.state !== 'built') return;

    expect(verifyRelease(path.join(out, 'content')).state).toBe('verified');
    const lessons = readJson<ReleaseManifest>(
      path.join(out, 'content/learning-release.json'),
    ).lessons;
    expect(lessons.map((lesson) => lesson.order)).toEqual(lessons.map((_, index) => index + 1));
    expect(lessons[position]?.lesson_id).toBe(NEW_LESSON_ID);

    const before = readJson<ReleaseManifest>(
      path.join(REAL_CONTENT, 'learning-release.json'),
    ).lessons;
    const existing = lessons.filter((lesson) => lesson.lesson_id !== NEW_LESSON_ID);
    expect(existing.map((lesson) => [lesson.lesson_id, lesson.lab_id])).toEqual(
      before.map((lesson) => [lesson.lesson_id, lesson.lab_id]),
    );
    for (const lesson of outcome.changes.lessons) {
      expect(lesson.status, lesson.lesson_id).toBe(
        lesson.lesson_id === NEW_LESSON_ID ? 'added' : 'unchanged',
      );
    }
  });
});

describe('a kit can be added (A2)', () => {
  it('packs the authored members and the injected lesson copy, ordered by path', () => {
    const { source, out } = releaseWithAdditions();
    const members = readZip(kitZip(out));
    const prefix = `${NEW_KIT_FOLDER}/`;
    expect(members.map((member) => member.path)).toEqual(
      [NEW_LESSON, 'README.md', 'manifest.json', 'tools/check.mjs']
        .sort()
        .map((name) => prefix + name),
    );
    const copy = members.find((member) => member.path === prefix + NEW_LESSON)!;
    expect(copy.bytes.equals(fs.readFileSync(lessonFile(source, NEW_LESSON)))).toBe(true);
  });

  it('keeps its manifest honest: every member but itself, with its real hash', () => {
    const { out } = releaseWithAdditions();
    const members = readZip(kitZip(out));
    const manifestMember = members.find((member) => member.path.endsWith('/manifest.json'))!;
    const manifest = JSON.parse(manifestMember.bytes.toString('utf8')) as KitManifest;

    const expected = members
      .filter((member) => member !== manifestMember)
      .map((member) => ({
        path: member.path.slice(`${NEW_KIT_FOLDER}/`.length),
        sha256: sha256(member.bytes),
      }));
    expect([...manifest.files].sort((a, b) => a.path.localeCompare(b.path))).toEqual(
      [...expected].sort((a, b) => a.path.localeCompare(b.path)),
    );
    expect(manifest).toMatchObject({
      manifest_version: '1.0',
      lab_id: NEW_KIT_ID,
      version: '1.0.0-draft',
      entry_document: 'README.md',
      lesson_ids: [NEW_LESSON_ID],
    });
  });

  it('lists the kit in the release manifest beside the existing five', () => {
    const { out } = releaseWithAdditions();
    const manifest = readJson<ReleaseManifest>(path.join(out, 'content/learning-release.json'));
    expect(manifest.lab_downloads).toHaveLength(6);
    expect(manifest.lab_downloads.at(-1)).toEqual({
      lab_id: NEW_KIT_ID,
      version: '1.0.0-draft',
      path: `labs/${NEW_KIT}.zip`,
      sha256: sha256(kitZip(out)),
      lesson_ids: [NEW_LESSON_ID],
    });
  });

  it('dates every member at midnight UTC of the release date', () => {
    const { out } = releaseWithAdditions();
    for (const member of readZip(kitZip(out))) {
      expect(member.modified, member.path).toEqual(new Date(`${CORRECTION_DATE}T00:00:00Z`));
    }
  });

  it('packs the same zip whatever the clock, the file times or the output name', () => {
    const source = seededSource();
    addLesson(source);
    const folder = addKit(source, [NEW_LESSON_ID]);
    moveReleaseVersion(source);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-01T09:00:01Z'));
    const first = built(source);

    vi.setSystemTime(new Date('2027-03-15T17:42:07Z'));
    const touched = new Date('2030-06-01T12:00:00Z');
    for (const file of [
      lessonFile(source, NEW_LESSON),
      ...listFiles(folder).map((f) => path.join(folder, f)),
    ]) {
      fs.utimesSync(file, touched, touched);
    }
    const second = built(source, path.join(tempDir(), 'some-other-name'));
    expect(kitZip(first).equals(kitZip(second))).toBe(true);
  });

  it('injects a byte-exact copy of an existing lesson into a kit that serves it', () => {
    const source = seededSource();
    addKit(source, ['LS-M020-01']);
    moveReleaseVersion(source);
    const out = outputPath();
    const outcome = buildRelease(source, out);
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');

    const copy = readZip(kitZip(out)).find(
      (member) => member.path === `${NEW_KIT_FOLDER}/${LESSON_1}`,
    );
    expect(copy?.bytes.equals(fs.readFileSync(lessonFile(source, LESSON_1)))).toBe(true);
  });

  it('serves two lessons from one added kit, each lesson naming the kit', () => {
    const source = seededSource();
    addLesson(source);
    addKit(source, [NEW_LESSON_ID, 'LS-M020-01']);
    moveReleaseVersion(source);
    const out = outputPath();
    const outcome = buildRelease(source, out);
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');

    const names = readZip(kitZip(out)).map((member) => member.path);
    expect(names).toContain(`${NEW_KIT_FOLDER}/${NEW_LESSON}`);
    expect(names).toContain(`${NEW_KIT_FOLDER}/${LESSON_1}`);
    const manifest = readJson<ReleaseManifest>(path.join(out, 'content/learning-release.json'));
    expect(manifest.lab_downloads.at(-1)?.lesson_ids).toEqual([NEW_LESSON_ID, 'LS-M020-01']);
    for (const id of [NEW_LESSON_ID, 'LS-M020-01']) {
      expect(manifest.lessons.find((lesson) => lesson.lesson_id === id)?.lab_id, id).toBe(
        NEW_KIT_ID,
      );
    }
  });

  it('fills in bytes as well as hashes in the older kit_id / kit_version manifest shape', () => {
    const source = seededSource();
    addLesson(source);
    addKit(source, [NEW_LESSON_ID], {}, { shape: 'kit' });
    moveReleaseVersion(source);
    const out = built(source);
    const members = readZip(kitZip(out));
    const manifest = JSON.parse(
      members.find((member) => member.path.endsWith('/manifest.json'))!.bytes.toString('utf8'),
    ) as { kit_version: string; files: { path: string; bytes: number; sha256: string }[] };
    expect(manifest.kit_version).toBe('1.0.0-draft');
    const readme = members.find((member) => member.path === `${NEW_KIT_FOLDER}/README.md`)!;
    expect(manifest.files.find((file) => file.path === 'README.md')).toEqual({
      path: 'README.md',
      bytes: readme.bytes.byteLength,
      sha256: sha256(readme.bytes),
    });
    for (const file of manifest.files) expect(typeof file.bytes, file.path).toBe('number');
  });
});

describe('additions in the change record (A3)', () => {
  it('names the added lesson and kit with no previous version or hash', () => {
    const { out, outcome } = releaseWithAdditions();
    if (outcome.state !== 'built') throw new Error(outcome.reason);
    const changes = readJson<ReleaseChanges>(path.join(out, 'release-changes.json'));
    expect(changes).toEqual(outcome.changes);

    expect(changes.lessons.filter((lesson) => lesson.status === 'added')).toEqual([
      {
        lesson_id: NEW_LESSON_ID,
        path: `lessons/${NEW_LESSON}`,
        status: 'added',
        previous_version: null,
        version: '1.0.0-draft',
        previous_sha256: null,
        sha256: sha256(fs.readFileSync(path.join(out, 'content/lessons', NEW_LESSON))),
      },
    ]);
    expect(changes.labs.filter((lab) => lab.status === 'added')).toEqual([
      {
        lab_id: NEW_KIT_ID,
        path: `labs/${NEW_KIT}.zip`,
        status: 'added',
        previous_version: null,
        version: '1.0.0-draft',
        previous_sha256: null,
        sha256: sha256(kitZip(out)),
      },
    ]);
    expect(changes.lessons.filter((lesson) => lesson.status === 'unchanged')).toHaveLength(15);
    expect(changes.labs.filter((lab) => lab.status === 'unchanged')).toHaveLength(5);
    expect(changes.activities.status).toBe('changed');
  });
});

describe('the previous release is the baseline (unchanged rules around additions)', () => {
  it('leaves every existing kit zip byte-identical to 1.0.1', () => {
    const { out } = releaseWithAdditions();
    const manifest = readJson<ReleaseManifest>(path.join(REAL_CONTENT, 'learning-release.json'));
    for (const lab of manifest.lab_downloads) {
      expect(
        fs
          .readFileSync(path.join(out, 'content', lab.path))
          .equals(fs.readFileSync(path.join(REAL_CONTENT, lab.path))),
        lab.lab_id,
      ).toBe(true);
    }
  });
});
