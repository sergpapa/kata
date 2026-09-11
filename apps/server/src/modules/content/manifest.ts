import type { ImportFailure } from './types.js';

export interface ManifestLessonEntry {
  readonly order: number;
  readonly lessonId: string;
  readonly documentId: string;
  readonly version: string;
  readonly module: string | null;
  readonly title: string;
  readonly path: string;
  readonly sha256: string;
  readonly labId: string | null;
}

export interface ManifestLabEntry {
  readonly labId: string;
  readonly version: string;
  readonly path: string;
  readonly sha256: string;
  readonly lessonIds: readonly string[];
}

export interface Manifest {
  readonly releaseId: string;
  readonly version: string;
  readonly date: string | null;
  readonly status: string | null;
  readonly audience: string | null;
  readonly sourceOfTruth: string | null;
  readonly lessons: readonly ManifestLessonEntry[];
  readonly labs: readonly ManifestLabEntry[];
  readonly activities: { readonly path: string; readonly sha256: string };
}

/** This importer is written against release manifest schema 1; 1.x is promised compatible. */
const SUPPORTED_SCHEMA_MAJOR = '1';

function invalid(message: string): ImportFailure {
  return { code: 'manifest_invalid', message, file: null };
}

function requireString(source: Record<string, unknown>, field: string, where: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalid(`The release manifest is missing ${field} on ${where}.`);
  }
  return value;
}

function optionalString(source: Record<string, unknown>, field: string): string | null {
  const value = source[field];
  return typeof value === 'string' && value !== '' ? value : null;
}

function requireObject(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid(`The release manifest has no readable ${where}.`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw invalid(`The release manifest is missing ${field}, or it is not a list.`);
  }
  return value;
}

function readLesson(entry: unknown, index: number): ManifestLessonEntry {
  const where = `lesson entry ${index + 1}`;
  const source = requireObject(entry, where);
  const order = source.order;
  if (typeof order !== 'number' || !Number.isInteger(order)) {
    throw invalid(`The release manifest is missing a whole-number order on ${where}.`);
  }
  const labId = source.lab_id;
  if (labId !== null && typeof labId !== 'string') {
    throw invalid(`The release manifest has an unreadable lab_id on ${where}.`);
  }
  return {
    order,
    lessonId: requireString(source, 'lesson_id', where),
    documentId: requireString(source, 'document_id', where),
    version: requireString(source, 'version', where),
    module: optionalString(source, 'module'),
    title: requireString(source, 'title', where),
    path: requireString(source, 'path', where),
    sha256: requireString(source, 'sha256', where),
    labId: labId === null || labId === '' ? null : labId,
  };
}

function readLab(entry: unknown, index: number): ManifestLabEntry {
  const where = `lab entry ${index + 1}`;
  const source = requireObject(entry, where);
  const lessonIds = requireArray(source.lesson_ids, `lesson_ids on ${where}`);
  for (const lessonId of lessonIds) {
    if (typeof lessonId !== 'string') {
      throw invalid(`The release manifest has an unreadable lesson ID on ${where}.`);
    }
  }
  return {
    labId: requireString(source, 'lab_id', where),
    version: requireString(source, 'version', where),
    path: requireString(source, 'path', where),
    sha256: requireString(source, 'sha256', where),
    lessonIds: lessonIds as readonly string[],
  };
}

/**
 * Reads the manifest's own shape. Nothing here touches the filesystem or checks a hash — this is
 * only the question "is this a release manifest this importer understands at all?".
 *
 * Throws an `ImportFailure` (not an `Error`) so the caller reports one named reason either way.
 */
export function readManifest(raw: unknown): Manifest {
  const source = requireObject(raw, 'manifest');

  const schemaVersion = requireString(source, 'schema_version', 'the manifest');
  if (!schemaVersion.startsWith(`${SUPPORTED_SCHEMA_MAJOR}.`)) {
    const failure: ImportFailure = {
      code: 'unsupported_manifest_schema',
      message:
        `The release manifest declares schema version ${schemaVersion}. This app reads ` +
        `${SUPPORTED_SCHEMA_MAJOR}.x manifests, and will not guess at a later one.`,
      file: null,
    };
    throw failure;
  }

  const activities = requireObject(source.activities, 'activities entry');

  return {
    releaseId: requireString(source, 'release_id', 'the manifest'),
    version: requireString(source, 'version', 'the manifest'),
    date: optionalString(source, 'date'),
    status: optionalString(source, 'status'),
    audience: optionalString(source, 'audience'),
    sourceOfTruth: optionalString(source, 'source_of_truth'),
    lessons: requireArray(source.lessons, 'lessons').map(readLesson),
    labs: requireArray(source.lab_downloads, 'lab_downloads').map(readLab),
    activities: {
      path: requireString(activities, 'path', 'the activities entry'),
      sha256: requireString(activities, 'sha256', 'the activities entry'),
    },
  };
}
