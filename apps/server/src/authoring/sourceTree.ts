/**
 * The source tree's shape — the contract between `seedSource`, `buildRelease` and the author who
 * edits it between them (docs/specs/release-packaging.md, "The source tree").
 */
import fs from 'node:fs';
import path from 'node:path';

export interface SourceLab {
  readonly lab_id: string;
  /** The kit's file name in `content/labs/`, `.zip` included. */
  readonly archive: string;
  readonly lesson_ids: readonly string[];
}

export interface SourceRelease {
  readonly package_id: string;
  readonly read_first: string;
  /** The superseded package, relative to the source directory. */
  readonly previous_release: string;
  readonly accepted_feedback: readonly string[];
  /** Every top-level `learning-release.json` field but `lessons`, `lab_downloads`, `activities`. */
  readonly release: Readonly<Record<string, unknown>> & {
    readonly release_id: string;
    readonly version: string;
    readonly date: string;
  };
  /** Lesson file names in course order. */
  readonly lessons: readonly string[];
  readonly labs: readonly SourceLab[];
}

/** Files the build writes into a package; never authored, so never seeded or carried. */
export const GENERATED_PACKAGE_FILES = [
  'package-manifest.json',
  'package-verification.json',
  'release-changes.json',
] as const;

/**
 * An expected problem with the author's input. Every one reaches the author as a named refusal
 * (exit 1 from the CLI), never as a stack trace; anything else that is thrown is a defect here.
 */
export class Refusal extends Error {}

/** Parses JSON text, refusing by name when it is not JSON. */
export function parseJson<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Refusal(`${label} is not readable JSON: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

/** Reads and parses a JSON file, refusing by name when it is missing or not JSON. */
export function readJsonFile<T>(file: string, label = path.basename(file)): T {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new Refusal(`${label} could not be read at ${file}.`, { cause: error });
  }
  return parseJson<T>(text, label);
}

export const RELEASE_JSON = 'release.json';
export const ACTIVITIES_FILE = 'trial-activities.json';
export const KIT_MANIFEST = 'manifest.json';

/** The fields `learning-release.json` carries that the source keeps elsewhere. */
export const DERIVED_RELEASE_FIELDS = ['lessons', 'lab_downloads', 'activities'] as const;

export const archiveBase = (archive: string) => archive.replace(/\.zip$/i, '');

/** Every file under a directory, as sorted forward-slash paths relative to it. */
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

/** Writes a file, creating its parent directories. */
export function writeFile(file: string, bytes: Buffer | string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}

/**
 * A sibling directory to assemble into before the final rename, so that a refusal or a crash part
 * way leaves nothing under the final name. The caller removes it in a `finally`.
 */
export function stagingDirFor(target: string): string {
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, `.${path.basename(target)}.staging-`));
}

/** JSON as every generated file is written: two-space indent and a final newline. */
export function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
