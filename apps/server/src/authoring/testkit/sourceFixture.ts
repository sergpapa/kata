/**
 * Helpers for the authoring tests: a seeded copy of the real current release, and the small
 * edits an author makes to it before a reissue. Excluded from the server build.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { repoRoot } from '../../config.js';
import { seedSource } from '../seed.js';

export const REAL_PACKAGE = path.join(repoRoot, 'content/releases/http-first-fifteen-v1_0_1');
export const REAL_CONTENT = path.join(REAL_PACKAGE, 'content');

export const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

const temps: string[] = [];

export function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kata-authoring-'));
  temps.push(dir);
  return dir;
}

export function cleanTemps(): void {
  for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
}

let template: string | undefined;

/**
 * The real 1.0.1 release seeded once per test worker. Seeding verifies and unpacks the whole
 * release; doing that for every test cost the suite enough CPU to time out unrelated web tests
 * (spec slice log, 2026-11-03), so each test gets a byte-identical copy instead.
 */
function seededTemplate(): string {
  if (template === undefined) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kata-authoring-template-'));
    process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
    const source = path.join(dir, 'source');
    const outcome = seedSource(REAL_PACKAGE, source);
    if (outcome.state !== 'seeded') throw new Error(`seed refused: ${outcome.reason}`);
    template = source;
  }
  return template;
}

/**
 * A fresh source tree seeded from the real 1.0.1 release: a copy of the worker's template, with
 * `previous_release` re-pointed from the copy's own location exactly as `seedSource` would write it.
 */
export function seededSource(parent = tempDir()): string {
  const source = path.join(parent, 'source');
  fs.cpSync(seededTemplate(), source, { recursive: true });
  editReleaseJson(source, (release) => {
    release.previous_release = path.relative(source, REAL_PACKAGE).split(path.sep).join('/');
  });
  return source;
}

export function replaceInFile(file: string, from: string, to: string): void {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`${file} does not contain ${JSON.stringify(from)}`);
  fs.writeFileSync(file, text.replace(from, to));
}

export function lessonFile(source: string, name: string): string {
  return path.join(source, 'lessons', name);
}

/** Rewrites the front-matter `version:` line of a source lesson. */
export function setLessonVersion(source: string, name: string, version: string): void {
  const file = lessonFile(source, name);
  const text = fs.readFileSync(file, 'utf8');
  const next = text.replace(/^version: "[^"]*"$/m, `version: "${version}"`);
  if (next === text) throw new Error(`${name} has no version line to change`);
  fs.writeFileSync(file, next);
}

export function editReleaseJson(source: string, edit: (release: SourceRelease) => void): void {
  const file = path.join(source, 'release.json');
  const release = JSON.parse(fs.readFileSync(file, 'utf8')) as SourceRelease;
  edit(release);
  fs.writeFileSync(file, `${JSON.stringify(release, null, 2)}\n`);
}

export interface SourceRelease {
  package_id: string;
  read_first: string;
  previous_release: string;
  release: { version: string; date: string; [field: string]: unknown };
  accepted_feedback: string[];
  lessons: string[];
  labs: { lab_id: string; archive: string; lesson_ids: string[] }[];
}

export const LESSON_1 = 'HTTP_Lesson_01_Student_Edition_v2.md';
export const LESSON_2 = 'HTTP_Lesson_02_Student_Edition_v1.md';
export const LESSON_5 = 'HTTP_Lesson_05_Student_Edition_v1.md';
export const KIT_02 = 'HTTP_Lesson_02_Local_Server_Kit_v1';
export const KIT_03_05 = 'HTTP_Lessons_03_05_Local_Kit_v1';
export const KIT_06_08 = 'HTTP_Lessons_06_08_Local_Kit_v1';
export const CORRECTION_DATE = '2026-11-03';

/**
 * The correction the spec's round trip (C13) describes: one line of Lesson 5, with every version
 * that must move — the lesson, its three activities, the 03-05 kit that carries it, the release.
 */
export function correctLesson5(source: string): void {
  replaceInFile(
    lessonFile(source, LESSON_5),
    'Today you will watch that happen.',
    'Today you will watch it happen.',
  );
  setLessonVersion(source, LESSON_5, '1.0.1-draft');
  setActivityLessonVersion(source, 'LS-M020-05', '1.0.1-draft');
  setKitVersion(source, KIT_03_05, '1.0.1-draft');
  editReleaseJson(source, (release) => {
    release.release.version = '1.0.2-draft';
    release.release.date = CORRECTION_DATE;
  });
}

/**
 * A not-yet-existing output package path, by default inside its own empty temporary parent. A test
 * that shares one build across several assertions passes a parent it removes itself.
 */
export function outputPath(parent = tempDir()): string {
  return path.join(parent, 'http-first-fifteen-v1_0_2');
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** The single inner folder a seeded kit was unpacked into. */
export function kitFolder(source: string, archiveBase: string): string {
  const root = path.join(source, 'labs', archiveBase);
  const [inner] = fs.readdirSync(root);
  if (inner === undefined) throw new Error(`${root} is empty`);
  return path.join(root, inner);
}

/** Sets a kit's version in whichever field its manifest uses (`version` or `kit_version`). */
export function setKitVersion(source: string, archiveBase: string, version: string): void {
  const file = path.join(kitFolder(source, archiveBase), 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const field = 'kit_version' in manifest ? 'kit_version' : 'version';
  manifest[field] = version;
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Sets `lesson_version` on every activity of one lesson. */
export function setActivityLessonVersion(source: string, lessonId: string, version: string): void {
  const file = path.join(source, 'trial-activities.json');
  const set = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    activities: { lesson_id: string; lesson_version: string }[];
  };
  for (const activity of set.activities) {
    if (activity.lesson_id === lessonId) activity.lesson_version = version;
  }
  fs.writeFileSync(file, `${JSON.stringify(set, null, 2)}\n`);
}

export const NEW_LESSON = 'HTTP_Lesson_16_Student_Edition_v1.md';
export const NEW_LESSON_ID = 'LS-M021-08';
export const NEW_KIT = 'HTTP_Lesson_16_Review_Kit_v1';
export const NEW_KIT_ID = 'FSSE-HTTP-LAB-16';
export const NEW_KIT_FOLDER = 'http-lesson-16-lab';

/**
 * Writes a minimal new lesson into the source and lists it in `release.json`, at `position` (a
 * zero-based index into `lessons`) or at the end. It is a lesson the previous release does not have.
 */
export function addLesson(
  source: string,
  options: { position?: number; version?: string } = {},
): void {
  const version = options.version ?? '1.0.0-draft';
  fs.writeFileSync(
    lessonFile(source, NEW_LESSON),
    [
      '---',
      'document_id: FSSE-HTTP-STUDENT-16',
      `version: "${version}"`,
      'date: "2026-11-19"',
      'module: M021',
      `candidate_lesson_id: ${NEW_LESSON_ID}`,
      'status: "Test fixture"',
      '---',
      '',
      '# Lesson 16: Review, justified disagreement, revision',
      '',
      'A lesson the previous release does not have.',
      '',
      '## Practice A: review a claim',
      '',
      'Say what evidence would change your mind.',
      '',
    ].join('\n'),
  );
  editReleaseJson(source, (release) => {
    const at = options.position ?? release.lessons.length;
    release.lessons.splice(at, 0, NEW_LESSON);
  });
}

/** Adds one activity for the new lesson, at the lesson's version. */
export function addActivity(source: string, version = '1.0.0-draft'): void {
  const file = path.join(source, 'trial-activities.json');
  const set = JSON.parse(fs.readFileSync(file, 'utf8')) as { activities: unknown[] };
  set.activities.push({
    activity_id: 'ACT-M021-08-01',
    lesson_id: NEW_LESSON_ID,
    lesson_version: version,
    kind: 'explanation',
    title: 'Practice A: review a claim',
    source_heading: 'Practice A: review a claim',
    prompt_markdown: 'Say what evidence would change your mind.',
    prompt_scope: 'Exact authored section excerpt.',
    feedback_source_heading: null,
    response_fields: ['explanation', 'help_used'],
    response_fields_required: false,
    grading: null,
    formal_evidence_award: null,
  });
  fs.writeFileSync(file, `${JSON.stringify(set, null, 2)}\n`);
}

/**
 * Writes a new kit into the source and lists it in `release.json`, serving `lessonIds`. Its
 * manifest lists no files yet: keeping `files[]` honest is the build's job. `extra` adds authored
 * members by path relative to the kit's top folder.
 */
export function addKit(
  source: string,
  lessonIds: string[],
  extra: Record<string, string> = {},
  options: {
    /** `kit` writes the older manifest shape: `kit_id`, `kit_version`, `bytes` per file. */
    shape?: 'lab' | 'kit';
    /** Fields merged over the authored manifest, `undefined` removing one. */
    manifest?: Record<string, unknown>;
  } = {},
): string {
  const folder = path.join(source, 'labs', NEW_KIT, NEW_KIT_FOLDER);
  fs.mkdirSync(folder, { recursive: true });
  const base: Record<string, unknown> =
    options.shape === 'kit'
      ? {
          manifest_version: '1.0',
          kit_id: NEW_KIT_ID,
          kit_version: '1.0.0-draft',
          lesson_ids: lessonIds,
          files: [{ path: 'README.md', bytes: 0, sha256: '' }],
        }
      : {
          manifest_version: '1.0',
          lab_id: NEW_KIT_ID,
          version: '1.0.0-draft',
          entry_document: 'README.md',
          lesson_ids: lessonIds,
          files: [],
        };
  const manifest = { ...base, ...options.manifest };
  for (const [field, value] of Object.entries(manifest)) {
    if (value === undefined) delete manifest[field];
  }
  const members: Record<string, string> = {
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'README.md': '# Lesson 16 kit\n\nA kit the previous release does not have.\n',
    'tools/check.mjs': "console.log('checked');\n",
    ...extra,
  };
  for (const [relative, text] of Object.entries(members)) {
    fs.mkdirSync(path.dirname(path.join(folder, relative)), { recursive: true });
    fs.writeFileSync(path.join(folder, relative), text);
  }
  editReleaseJson(source, (release) => {
    release.labs.push({ lab_id: NEW_KIT_ID, archive: `${NEW_KIT}.zip`, lesson_ids: lessonIds });
  });
  return folder;
}

/** Moves the release version, which every build that releases anything must do. */
export function moveReleaseVersion(source: string, version = '1.1.0-draft'): void {
  editReleaseJson(source, (release) => {
    release.release.version = version;
    release.release.date = CORRECTION_DATE;
  });
}

/** Every file under a directory, as forward-slash paths relative to it. */
export function listFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out.sort();
}
