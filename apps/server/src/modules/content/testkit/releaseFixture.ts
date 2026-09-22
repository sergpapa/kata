/**
 * Builds a release directory on disk whose hashes are real, so a test can break exactly one thing
 * and watch the importer name it. Excluded from the server build; see apps/server/tsconfig.json.
 *
 * `makeFixture()` returns files and a manifest already carrying correct hashes. A test mutates
 * either — delete a file, patch a hash, rename an ID — and then calls `writeFixture`.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface FixtureLessonEntry {
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

export interface FixtureLabEntry {
  lab_id: string;
  version: string;
  path: string;
  sha256: string;
  lesson_ids: string[];
}

export interface FixtureManifest {
  schema_version: string;
  release_id: string;
  version: string;
  date: string;
  status: string;
  audience: string;
  source_of_truth: string;
  lesson_key_field: string;
  lessons: FixtureLessonEntry[];
  lab_downloads: FixtureLabEntry[];
  activities: { path: string; sha256: string };
}

export interface Fixture {
  /** Relative path within the release directory → the bytes written there. */
  readonly files: Map<string, Buffer>;
  readonly manifest: FixtureManifest;
}

export function sha256(bytes: Buffer | string): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** A lesson file exactly as the author ships one: YAML front matter, then Markdown starting at H1. */
export function lessonSource(frontMatter: string, body: string): string {
  return `---\n${frontMatter.trim()}\n---\n\n${body.trim()}\n`;
}

function defaultLesson(n: 1 | 2): string {
  return lessonSource(
    [
      `document_id: FIX-DOC-0${n}`,
      `version: "1.0.0-draft"`,
      `module: M020`,
      `candidate_lesson_id: FIX-LS-0${n}`,
      `prerequisites:`,
      `  - "Has opened a web page"`,
    ].join('\n'),
    `# Lesson ${n}: the authored title\n\nAuthored prose for lesson ${n}.`,
  );
}

/**
 * Two lessons — one reading-only, one with a lab — plus a lab kit and an activity file. Small on
 * purpose: every test starts from a release that imports cleanly.
 */
export function makeFixture(): Fixture {
  const files = new Map<string, Buffer>([
    ['lessons/lesson-01.md', Buffer.from(defaultLesson(1), 'utf8')],
    ['lessons/lesson-02.md', Buffer.from(defaultLesson(2), 'utf8')],
    ['labs/kit-02.zip', Buffer.from('PK pretend kit bytes', 'utf8')],
    ['trial-activities.json', Buffer.from('{"activities": []}\n', 'utf8')],
  ]);

  const hashOf = (relativePath: string): string => sha256(files.get(relativePath) as Buffer);

  const manifest: FixtureManifest = {
    schema_version: '1.0.0',
    release_id: 'FIX-RELEASE',
    version: '1.0.0-draft',
    date: '2026-09-11',
    status: 'owner-review candidate',
    audience: 'Fixture',
    source_of_truth: 'The supplied UTF-8 Markdown lesson files',
    lesson_key_field: 'candidate_lesson_id',
    lessons: [
      {
        order: 1,
        lesson_id: 'FIX-LS-01',
        document_id: 'FIX-DOC-01',
        version: '1.0.0-draft',
        module: 'M020',
        title: 'Lesson 1 as the manifest names it',
        path: 'lessons/lesson-01.md',
        sha256: hashOf('lessons/lesson-01.md'),
        lab_id: null,
      },
      {
        order: 2,
        lesson_id: 'FIX-LS-02',
        document_id: 'FIX-DOC-02',
        version: '1.0.0-draft',
        module: 'M020',
        title: 'Lesson 2 as the manifest names it',
        path: 'lessons/lesson-02.md',
        sha256: hashOf('lessons/lesson-02.md'),
        lab_id: 'FIX-LAB-02',
      },
    ],
    lab_downloads: [
      {
        lab_id: 'FIX-LAB-02',
        version: '1.0.0-draft',
        path: 'labs/kit-02.zip',
        sha256: hashOf('labs/kit-02.zip'),
        lesson_ids: ['FIX-LS-02'],
      },
    ],
    activities: {
      path: 'trial-activities.json',
      sha256: hashOf('trial-activities.json'),
    },
  };

  return { files, manifest };
}

/** Replaces a lesson file's bytes and re-hashes it, for the cases where the change is legitimate. */
export function replaceLessonFile(fixture: Fixture, relativePath: string, source: string): void {
  const bytes = Buffer.from(source, 'utf8');
  fixture.files.set(relativePath, bytes);
  const entry = fixture.manifest.lessons.find((lesson) => lesson.path === relativePath);
  if (!entry) throw new Error(`No manifest lesson entry for ${relativePath}`);
  entry.sha256 = sha256(bytes);
}

/**
 * Replaces the activity file's bytes and re-hashes the manifest entry, so a test can break what
 * the file *says* without breaking the hash and being refused for the wrong reason.
 */
export function replaceActivitySet(fixture: Fixture, sourceText: string): void {
  const bytes = Buffer.from(sourceText, 'utf8');
  fixture.files.set(fixture.manifest.activities.path, bytes);
  fixture.manifest.activities.sha256 = sha256(bytes);
}

export function writeFixture(dir: string, fixture: Fixture): string {
  for (const [relativePath, bytes] of fixture.files) {
    const target = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  fs.writeFileSync(
    path.join(dir, 'learning-release.json'),
    `${JSON.stringify(fixture.manifest, null, 2)}\n`,
    'utf8',
  );
  return dir;
}

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'educode-release-'));
}

export function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Copies a real release directory so a test can corrupt one entry of the author's own manifest.
 * The supplied package is an input and stays byte-for-byte intact; only the copy is touched.
 */
export function copyReleaseDir(sourceDir: string, targetDir: string): string {
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  return targetDir;
}

/** Reads, patches and rewrites the manifest of a release directory already on disk. */
export function patchManifest(dir: string, patch: (manifest: FixtureManifest) => void): void {
  const file = path.join(dir, 'learning-release.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as FixtureManifest;
  patch(manifest);
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
