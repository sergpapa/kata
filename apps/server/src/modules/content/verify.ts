import fs from 'node:fs';
import path from 'node:path';
import { parseActivitySet } from './activitySet.js';
import { firstHeadingOneText, splitFrontMatter } from './frontMatter.js';
import { readManifest, type Manifest, type ManifestLessonEntry } from './manifest.js';
import {
  MANIFEST_FILENAME,
  isImportFailure,
  readVerifiedBytes,
  refuse,
  sha256Of,
} from './releaseFiles.js';
import type {
  VerificationOutcome,
  VerifiedLabKit,
  VerifiedLesson,
  VerifiedRelease,
} from './types.js';

/** Everything that can be judged from the manifest alone, before a single lesson file is opened. */
function checkManifestConsistency(manifest: Manifest): void {
  if (manifest.lessons.length === 0) {
    refuse({
      code: 'manifest_invalid',
      message: `Release ${manifest.releaseId} lists no lessons. Lessons that have not been supplied stay planned; they are never filled in here.`,
      file: null,
    });
  }

  const seenLessonIds = new Set<string>();
  const seenOrders = new Set<number>();
  for (const lesson of manifest.lessons) {
    if (seenLessonIds.has(lesson.lessonId)) {
      refuse({
        code: 'duplicate_lesson_id',
        message: `The release lists lesson ${lesson.lessonId} more than once. A lesson ID identifies one lesson.`,
        file: null,
      });
    }
    seenLessonIds.add(lesson.lessonId);
    if (seenOrders.has(lesson.order)) {
      refuse({
        code: 'duplicate_lesson_order',
        message: `The release puts two lessons at position ${lesson.order}. The reading order has to be unambiguous.`,
        file: null,
      });
    }
    seenOrders.add(lesson.order);
  }

  const labsById = new Map<string, (typeof manifest.labs)[number]>();
  for (const lab of manifest.labs) {
    if (labsById.has(lab.labId)) {
      refuse({
        code: 'duplicate_lab_id',
        message: `The release lists lab kit ${lab.labId} more than once.`,
        file: null,
      });
    }
    labsById.set(lab.labId, lab);
  }

  for (const lesson of manifest.lessons) {
    if (lesson.labId !== null && !labsById.has(lesson.labId)) {
      refuse({
        code: 'lab_not_found',
        message: `Lesson ${lesson.lessonId} needs lab kit ${lesson.labId}, and the release does not carry it.`,
        file: null,
      });
    }
  }

  for (const lab of manifest.labs) {
    const pointingAtIt = manifest.lessons
      .filter((lesson) => lesson.labId === lab.labId)
      .map((lesson) => lesson.lessonId);
    const declared = [...lab.lessonIds].sort();
    if (declared.join(',') !== [...pointingAtIt].sort().join(',')) {
      refuse({
        code: 'lab_lesson_mismatch',
        message: `Lab kit ${lab.labId} says it is for ${declared.join(', ') || 'no lessons'}, but the lessons asking for it are ${pointingAtIt.join(', ') || 'none'}.`,
        file: null,
      });
    }
  }
}

/**
 * The activity file, judged against the lessons this release actually carries.
 *
 * A file that cannot be read at all is a refusal, not a page that quietly shows no activities: the
 * views are derived at request time, so an unparseable set would otherwise throw on every lesson
 * where the app promises a named refusal once. A heading an activity cannot find is a different
 * matter entirely and is *not* checked here — the lesson still reads, and the reader is told at the
 * foot of it (docs/specs/activity-placement.md, decision 3).
 */
function checkActivitySet(
  sourceText: string,
  sourcePath: string,
  candidateLessonIds: readonly string[],
): void {
  const parsed = parseActivitySet(sourceText);
  if (!parsed.ok) {
    refuse({
      code: 'activity_set_invalid',
      message: `${sourcePath} could not be read as an activity set: ${parsed.detail}`,
      file: sourcePath,
    });
  }

  const lessons = new Set(candidateLessonIds);
  const seen = new Set<string>();
  for (const activity of parsed.activities) {
    if (seen.has(activity.activityId)) {
      refuse({
        code: 'duplicate_activity_id',
        message: `${sourcePath} lists activity ${activity.activityId} more than once. An activity ID identifies one activity.`,
        file: sourcePath,
      });
    }
    seen.add(activity.activityId);

    if (!lessons.has(activity.lessonId)) {
      refuse({
        code: 'activity_lesson_mismatch',
        message: `Activity ${activity.activityId} is for lesson ${activity.lessonId}, and the release does not carry that lesson.`,
        file: sourcePath,
      });
    }
  }
}

function verifyLesson(
  releaseRealDir: string,
  entry: ManifestLessonEntry,
  sourceOfTruthLabel: string,
): VerifiedLesson {
  const bytes = readVerifiedBytes(releaseRealDir, entry.path, entry.sha256);
  const sourceText = bytes.toString('utf8');

  const split = splitFrontMatter(sourceText);
  if (!split.ok) {
    refuse({
      code: split.problem.kind === 'missing' ? 'front_matter_missing' : 'front_matter_invalid',
      message: `${entry.path} does not carry readable front matter: ${split.problem.detail}. ${sourceOfTruthLabel}`,
      file: entry.path,
    });
  }
  const { frontMatter, body } = split.value;

  const candidateLessonId = frontMatter.candidate_lesson_id;
  if (typeof candidateLessonId !== 'string' || candidateLessonId.trim() === '') {
    refuse({
      code: 'front_matter_invalid',
      message: `${entry.path} has no candidate_lesson_id in its front matter, and that is the lesson's stable key.`,
      file: entry.path,
    });
  }
  if (candidateLessonId !== entry.lessonId) {
    refuse({
      code: 'conflicting_lesson_id',
      message: `The release lists ${entry.lessonId} at ${entry.path}, but that file says it is ${candidateLessonId}.`,
      file: entry.path,
    });
  }

  // Compared as written, whatever YAML made of it. An unquoted `version: 2` parses to a number, and
  // a check that only looks at strings would wave through exactly the substituted lesson this
  // catches. Absent is different from present-and-wrong: the manifest may carry a field the file
  // does not.
  const documentId = frontMatter.document_id;
  if (documentId !== undefined && documentId !== null && String(documentId) !== entry.documentId) {
    refuse({
      code: 'conflicting_document_id',
      message: `The release lists document ${entry.documentId} at ${entry.path}, but that file is document ${String(documentId)}.`,
      file: entry.path,
    });
  }

  const version = frontMatter.version;
  if (version !== undefined && version !== null && String(version) !== entry.version) {
    refuse({
      code: 'conflicting_version',
      message: `The release lists ${entry.path} at version ${entry.version}, but that file is version ${String(version)}.`,
      file: entry.path,
    });
  }

  const displayTitle = firstHeadingOneText(body);
  if (displayTitle === undefined) {
    refuse({
      code: 'title_missing',
      message: `${entry.path} has no level-one heading, and the lesson's title is its first heading — never its filename.`,
      file: entry.path,
    });
  }

  const moduleValue = frontMatter.module;
  return {
    order: entry.order,
    candidateLessonId,
    contentVersion: entry.version,
    documentId: entry.documentId,
    module: typeof moduleValue === 'string' ? moduleValue : entry.module,
    displayTitle,
    manifestTitle: entry.title,
    sourcePath: entry.path,
    sha256: entry.sha256.toLowerCase(),
    frontMatter,
    sourceText,
    labId: entry.labId,
  };
}

/**
 * Reads a release directory and proves it is what its manifest says, or refuses it naming the file
 * at fault. There is no partial result: a release either verifies whole or yields nothing, because
 * a silently partial import is the failure most likely to waste the owner's review time (ADR 0005).
 */
export function verifyRelease(releaseDir: string): VerificationOutcome {
  try {
    let releaseRealDir: string;
    try {
      releaseRealDir = fs.realpathSync(releaseDir);
    } catch {
      return {
        state: 'failed',
        failure: {
          code: 'manifest_missing',
          message: `There is no release directory at ${releaseDir}, so ${MANIFEST_FILENAME} could not be read.`,
          file: null,
        },
      };
    }

    const manifestPath = path.join(releaseRealDir, MANIFEST_FILENAME);
    let manifestBytes: Buffer;
    try {
      manifestBytes = fs.readFileSync(manifestPath);
    } catch {
      refuse({
        code: 'manifest_missing',
        message: `There is no ${MANIFEST_FILENAME} in ${releaseRealDir}. That file is what a release is.`,
        file: null,
      });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(manifestBytes.toString('utf8'));
    } catch (error) {
      refuse({
        code: 'manifest_unreadable',
        message: `${MANIFEST_FILENAME} is not readable JSON: ${(error as Error).message}`,
        file: null,
      });
    }

    const manifest = readManifest(raw);
    checkManifestConsistency(manifest);

    const sourceOfTruthLabel = manifest.sourceOfTruth
      ? `The release says its source of truth is: ${manifest.sourceOfTruth}`
      : 'The lesson files are the source of truth.';

    const lessons = [...manifest.lessons]
      .sort((left, right) => left.order - right.order)
      .map((entry) => verifyLesson(releaseRealDir, entry, sourceOfTruthLabel));

    const labKits: VerifiedLabKit[] = manifest.labs.map((lab) => {
      const bytes = readVerifiedBytes(releaseRealDir, lab.path, lab.sha256);
      return {
        labId: lab.labId,
        version: lab.version,
        sourcePath: lab.path,
        sha256: lab.sha256.toLowerCase(),
        byteSize: bytes.byteLength,
        lessonIds: lab.lessonIds,
      };
    });

    const activityBytes = readVerifiedBytes(
      releaseRealDir,
      manifest.activities.path,
      manifest.activities.sha256,
    );
    checkActivitySet(
      activityBytes.toString('utf8'),
      manifest.activities.path,
      lessons.map((lesson) => lesson.candidateLessonId),
    );

    const release: VerifiedRelease = {
      releaseId: manifest.releaseId,
      version: manifest.version,
      date: manifest.date,
      status: manifest.status,
      audience: manifest.audience,
      sourceOfTruth: manifest.sourceOfTruth,
      manifestSha256: sha256Of(manifestBytes),
      lessons,
      labKits,
      activitySet: {
        sourcePath: manifest.activities.path,
        sha256: manifest.activities.sha256.toLowerCase(),
        sourceText: activityBytes.toString('utf8'),
      },
    };
    return { state: 'verified', release };
  } catch (error) {
    if (isImportFailure(error)) return { state: 'failed', failure: error };
    throw error;
  }
}
