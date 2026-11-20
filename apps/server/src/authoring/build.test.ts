import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { verifyRelease } from '../modules/content/verify.js';
import { buildRelease, type BuildOutcome, type ReleaseChanges } from './build.js';
import { readZip, type ZipEntry } from './zip.js';
import {
  CORRECTION_DATE,
  KIT_02,
  KIT_03_05,
  KIT_06_08,
  LESSON_2,
  LESSON_5,
  REAL_CONTENT,
  cleanTemps,
  correctLesson5,
  editReleaseJson,
  kitFolder,
  lessonFile,
  listFiles,
  outputPath,
  readJson,
  replaceInFile,
  seededSource,
  setActivityLessonVersion,
  setKitVersion,
  setLessonVersion,
  sha256,
} from './testkit/sourceFixture.js';

afterEach(() => {
  vi.useRealTimers();
  cleanTemps();
});

interface LessonEntry {
  order: number;
  lesson_id: string;
  document_id: string;
  module: string;
  version: string;
  title: string;
  path: string;
  sha256: string;
}
interface ReleaseManifest {
  version: string;
  lessons: LessonEntry[];
  lab_downloads: { lab_id: string; version: string; path: string; sha256: string }[];
}
type KitManifest = Record<string, unknown> & {
  files: { path: string; sha256: string; bytes?: number }[];
};

let shared: { source: string; out: string; outcome: BuildOutcome } | undefined;
let sharedParent: string | undefined;

/**
 * The C13 correction (plus an accepted register entry) built once for the whole file. The tests
 * that use it only read the output, and building it per test cost enough CPU to time out
 * unrelated web tests in the full suite (spec slice log, 2026-11-03).
 */
function correctedRelease(): { source: string; out: string; outcome: BuildOutcome } {
  if (shared === undefined) {
    sharedParent = fs.mkdtempSync(path.join(os.tmpdir(), 'kata-authoring-shared-'));
    const source = seededSource(sharedParent);
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      release.accepted_feedback = ['CF-003'];
    });
    const out = outputPath(sharedParent);
    shared = { source, out, outcome: buildRelease(source, out) };
  }
  return shared;
}

afterAll(() => {
  if (sharedParent !== undefined) fs.rmSync(sharedParent, { recursive: true, force: true });
});

function built(source: string, out = outputPath()): string {
  const outcome = buildRelease(source, out);
  if (outcome.state !== 'built') throw new Error(`build refused: ${outcome.reason}`);
  return out;
}

const kitMembers = (packageDir: string, kit: string) =>
  readZip(fs.readFileSync(path.join(packageDir, 'content/labs', `${kit}.zip`)));
const kitManifest = (members: ZipEntry[]) =>
  JSON.parse(
    members.find((member) => member.path.endsWith('/manifest.json'))!.bytes.toString('utf8'),
  ) as KitManifest;
const realKitMembers = (kit: string) =>
  readZip(fs.readFileSync(path.join(REAL_CONTENT, 'labs', `${kit}.zip`)));

describe('the round trip on the real release (C3, C9, C13)', () => {
  it('is accepted by the importer and changes exactly the corrected lesson', () => {
    const { out } = correctedRelease();

    const verified = verifyRelease(path.join(out, 'content'));
    expect(verified.state).toBe('verified');
    if (verified.state === 'verified') expect(verified.release.version).toBe('1.0.2-draft');

    const before = readJson<ReleaseManifest>(path.join(REAL_CONTENT, 'learning-release.json'));
    const after = readJson<ReleaseManifest>(path.join(out, 'content/learning-release.json'));
    const unchanged = after.lessons.filter((lesson) => lesson.lesson_id !== 'LS-M020-05');
    expect(unchanged).toHaveLength(14);
    for (const lesson of unchanged) {
      const previous = before.lessons.find((entry) => entry.lesson_id === lesson.lesson_id)!;
      expect(lesson, lesson.lesson_id).toEqual(previous);
      const bytes = fs.readFileSync(path.join(out, 'content', lesson.path));
      expect(bytes.equals(fs.readFileSync(path.join(REAL_CONTENT, previous.path)))).toBe(true);
    }
    const lesson5 = after.lessons.find((lesson) => lesson.lesson_id === 'LS-M020-05')!;
    expect(lesson5.version).toBe('1.0.1-draft');
    expect(lesson5.sha256).toBe(sha256(fs.readFileSync(path.join(out, 'content', lesson5.path))));
  });

  it('reuses the four untouched kit zips byte for byte', () => {
    const { out } = correctedRelease();
    const before = readJson<ReleaseManifest>(path.join(REAL_CONTENT, 'learning-release.json'));
    const after = readJson<ReleaseManifest>(path.join(out, 'content/learning-release.json'));
    const untouched = after.lab_downloads.filter((lab) => lab.lab_id !== 'FSSE-HTTP-LAB-03-05');
    expect(untouched).toHaveLength(4);
    for (const lab of untouched) {
      const previous = before.lab_downloads.find((entry) => entry.lab_id === lab.lab_id)!;
      expect(lab, lab.lab_id).toEqual(previous);
      const bytes = fs.readFileSync(path.join(out, 'content', lab.path));
      expect(
        bytes.equals(fs.readFileSync(path.join(REAL_CONTENT, previous.path))),
        lab.lab_id,
      ).toBe(true);
    }
  });

  it('ships every authored file exactly as it is in the source', () => {
    const { source, out } = correctedRelease();
    const same = (a: string, b: string) => fs.readFileSync(a).equals(fs.readFileSync(b));

    expect(same(path.join(out, 'content/lessons', LESSON_5), lessonFile(source, LESSON_5))).toBe(
      true,
    );
    expect(
      same(
        path.join(out, 'content/trial-activities.json'),
        path.join(source, 'trial-activities.json'),
      ),
    ).toBe(true);
    const packageFiles = listFiles(path.join(source, 'package'));
    expect(packageFiles.length).toBeGreaterThan(10);
    for (const file of packageFiles) {
      expect(same(path.join(out, file), path.join(source, 'package', file)), file).toBe(true);
    }
  });
});

describe('lesson entries are derived from the lesson (C4)', () => {
  it('follows an edited title, document ID and module, and the importer accepts it', () => {
    const source = seededSource();
    const file = lessonFile(source, LESSON_2);
    replaceInFile(file, '# Lesson 2: Give the browser', '# Lesson 2: Hand the browser');
    replaceInFile(file, 'document_id: FSSE-HTTP-STUDENT-02', 'document_id: FSSE-HTTP-STUDENT-02B');
    replaceInFile(file, 'module: M020', 'module: M020B');
    setLessonVersion(source, LESSON_2, '1.0.2-draft');
    setActivityLessonVersion(source, 'LS-M020-02', '1.0.2-draft');
    setKitVersion(source, KIT_02, '1.0.2-draft');
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    const out = built(source);

    expect(verifyRelease(path.join(out, 'content')).state).toBe('verified');
    const entry = readJson<ReleaseManifest>(
      path.join(out, 'content/learning-release.json'),
    ).lessons.find((lesson) => lesson.lesson_id === 'LS-M020-02')!;
    expect(entry.title).toBe('Lesson 2: Hand the browser an address—and something to answer');
    expect(entry.document_id).toBe('FSSE-HTTP-STUDENT-02B');
    expect(entry.module).toBe('M020B');
    expect(entry.version).toBe('1.0.2-draft');
  });

  it('takes order from the position in release.json', () => {
    const source = seededSource();
    correctLesson5(source);
    editReleaseJson(source, (release) => {
      const [third, fourth] = [release.lessons[2]!, release.lessons[3]!];
      release.lessons[2] = fourth;
      release.lessons[3] = third;
    });
    const out = built(source);
    const lessons = readJson<ReleaseManifest>(
      path.join(out, 'content/learning-release.json'),
    ).lessons;
    const orderOf = (id: string) => lessons.find((lesson) => lesson.lesson_id === id)!.order;
    expect(orderOf('LS-M020-04')).toBe(3);
    expect(orderOf('LS-M020-03')).toBe(4);
  });
});

describe('kits (C5, C6)', () => {
  it('repacks the corrected kit: new lesson copy, one manifest hash moved, all else as authored', () => {
    const { out } = correctedRelease();

    const before = realKitMembers(KIT_03_05);
    const after = kitMembers(out, KIT_03_05);
    expect(after.map((member) => member.path)).toEqual(before.map((member) => member.path));
    const changed = after
      .filter((member, index) => !member.bytes.equals(before[index]!.bytes))
      .map((member) => member.path);
    expect(changed.sort()).toEqual(
      [`http-lessons-03-05-lab/${LESSON_5}`, 'http-lessons-03-05-lab/manifest.json'].sort(),
    );

    const canonical = fs.readFileSync(path.join(out, 'content/lessons', LESSON_5));
    expect(after.find((member) => member.path.endsWith(LESSON_5))!.bytes.equals(canonical)).toBe(
      true,
    );
    const oldManifest = kitManifest(before);
    expect(kitManifest(after)).toEqual({
      ...oldManifest,
      version: '1.0.1-draft',
      files: oldManifest.files.map((file) =>
        file.path === LESSON_5 ? { ...file, sha256: sha256(canonical) } : file,
      ),
    });
  });

  it('rewrites an authored member hash in a kit-only change, and the importer accepts it', () => {
    const source = seededSource();
    const readme = path.join(kitFolder(source, KIT_06_08), 'README.md');
    fs.appendFileSync(readme, '\nOne more note.\n');
    setKitVersion(source, KIT_06_08, '1.0.2-draft');
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    const out = built(source);

    expect(verifyRelease(path.join(out, 'content')).state).toBe('verified');
    const members = kitMembers(out, KIT_06_08);
    const shipped = members.find((member) => member.path === 'http-lessons-06-08-lab/README.md')!;
    expect(shipped.bytes.equals(fs.readFileSync(readme))).toBe(true);
    const oldManifest = kitManifest(realKitMembers(KIT_06_08));
    expect(kitManifest(members)).toEqual({
      ...oldManifest,
      version: '1.0.2-draft',
      files: oldManifest.files.map((file) =>
        file.path === 'README.md' ? { ...file, sha256: sha256(shipped.bytes) } : file,
      ),
    });
  });

  it('updates bytes as well as hash in a kit manifest that records bytes', () => {
    const source = seededSource();
    replaceInFile(lessonFile(source, LESSON_2), '# Lesson 2: Give', '# Lesson 2: Now give');
    setLessonVersion(source, LESSON_2, '1.0.2-draft');
    setActivityLessonVersion(source, 'LS-M020-02', '1.0.2-draft');
    setKitVersion(source, KIT_02, '1.0.2-draft');
    editReleaseJson(source, (release) => {
      release.release.version = '1.0.2-draft';
    });
    const out = built(source);

    const canonical = fs.readFileSync(path.join(out, 'content/lessons', LESSON_2));
    const oldManifest = kitManifest(realKitMembers(KIT_02));
    expect(kitManifest(kitMembers(out, KIT_02))).toEqual({
      ...oldManifest,
      kit_version: '1.0.2-draft',
      files: oldManifest.files.map((file) =>
        file.path === LESSON_2
          ? { path: LESSON_2, bytes: canonical.byteLength, sha256: sha256(canonical) }
          : file,
      ),
    });
  });

  it('dates repacked members at midnight UTC of the release date', () => {
    const { out } = correctedRelease();
    for (const member of kitMembers(out, KIT_03_05)) {
      expect(member.modified, member.path).toEqual(new Date(`${CORRECTION_DATE}T00:00:00Z`));
    }
  });

  it('repacks a changed kit identically whatever the clock says', () => {
    const source = seededSource();
    correctLesson5(source);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-01T09:00:01Z'));
    const first = built(source);
    vi.setSystemTime(new Date('2027-03-15T17:42:07Z'));
    const second = built(source);
    const kit = `content/labs/${KIT_03_05}.zip`;
    expect(
      fs.readFileSync(path.join(first, kit)).equals(fs.readFileSync(path.join(second, kit))),
    ).toBe(true);
  });
});

describe('the change record and package manifest (C10, C12)', () => {
  it('gives every lesson, kit and the activity file its version and hash transition', () => {
    const { out, outcome } = correctedRelease();
    expect(outcome.state).toBe('built');
    if (outcome.state !== 'built') return;
    expect(readJson<ReleaseChanges>(path.join(out, 'release-changes.json'))).toEqual(
      outcome.changes,
    );

    const changes = outcome.changes;
    const shaOf = (...parts: string[]) => sha256(fs.readFileSync(path.join(...parts)));
    expect(changes.release_id).toBe('FSSE-HTTP-FIRST-FIFTEEN');
    expect(changes.previous_version).toBe('1.0.1-draft');
    expect(changes.version).toBe('1.0.2-draft');
    expect(changes.accepted_feedback).toEqual(['CF-003']);
    expect(changes.lessons).toHaveLength(15);
    expect(changes.lessons.filter((lesson) => lesson.status === 'changed')).toEqual([
      expect.objectContaining({
        lesson_id: 'LS-M020-05',
        previous_version: '1.0.0-draft',
        version: '1.0.1-draft',
        previous_sha256: shaOf(REAL_CONTENT, 'lessons', LESSON_5),
        sha256: shaOf(out, 'content/lessons', LESSON_5),
      }),
    ]);
    expect(changes.labs).toHaveLength(5);
    expect(changes.labs.filter((lab) => lab.status === 'changed')).toEqual([
      expect.objectContaining({
        lab_id: 'FSSE-HTTP-LAB-03-05',
        previous_version: '1.0.0-draft',
        version: '1.0.1-draft',
        previous_sha256: shaOf(REAL_CONTENT, 'labs', `${KIT_03_05}.zip`),
        sha256: shaOf(out, 'content/labs', `${KIT_03_05}.zip`),
      }),
    ]);
    expect(changes.activities).toEqual(
      expect.objectContaining({
        status: 'changed',
        previous_sha256: shaOf(REAL_CONTENT, 'trial-activities.json'),
        sha256: shaOf(out, 'content/trial-activities.json'),
      }),
    );
    const unchanged = changes.lessons.find((lesson) => lesson.lesson_id === 'LS-M020-01')!;
    expect(unchanged.status).toBe('unchanged');
    expect(unchanged.sha256).toBe(unchanged.previous_sha256);
  });

  it('lists every file of the package in package-manifest.json with its real hash', () => {
    const { source, out } = correctedRelease();
    const manifest = readJson<{
      package_id: string;
      version: string;
      files: { path: string; sha256: string }[];
    }>(path.join(out, 'package-manifest.json'));
    const release = readJson<{ package_id: string }>(path.join(source, 'release.json'));

    expect(manifest.package_id).toBe(release.package_id);
    expect(manifest.version).toBe('1.0.2-draft');
    const listed = manifest.files.map((file) => file.path).sort();
    expect(listed).toEqual(listFiles(out).filter((file) => file !== 'package-manifest.json'));
    expect(listed).toContain('release-changes.json');
    for (const file of manifest.files) {
      expect(sha256(fs.readFileSync(path.join(out, file.path))), file.path).toBe(file.sha256);
    }
  });

  it('records what it checked and, separately, what it did not run', () => {
    const { out } = correctedRelease();
    const record = readJson<{
      importer_verification: string;
      checks_run: string[];
      not_run_by_this_tool: string[];
    }>(path.join(out, 'package-verification.json'));

    expect(record.importer_verification).toBe('passed');
    expect([...record.checks_run].sort()).toEqual([
      'all_hashes_recomputed',
      'importer_verification',
      'nested_lesson_copies_match_canonical',
    ]);
    expect([...record.not_run_by_this_tool].sort()).toEqual([
      'browser_rehearsal',
      'kit_runtime_suites',
      'mermaid_parse_and_render',
    ]);
  });
});
