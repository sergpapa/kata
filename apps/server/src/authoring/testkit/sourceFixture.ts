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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'educode-authoring-'));
  temps.push(dir);
  return dir;
}

export function cleanTemps(): void {
  for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Seeds the real 1.0.1 release into a fresh temporary source tree and returns its path. */
export function seededSource(): string {
  const source = path.join(tempDir(), 'source');
  const outcome = seedSource(REAL_PACKAGE, source);
  if (outcome.state !== 'seeded') throw new Error(`seed refused: ${outcome.reason}`);
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
  release: { version: string; [field: string]: unknown };
  accepted_feedback: string[];
  lessons: string[];
  labs: { lab_id: string; archive: string; lesson_ids: string[] }[];
  [field: string]: unknown;
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
