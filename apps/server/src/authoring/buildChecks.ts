/**
 * The checks a build runs on the source before it writes anything (docs/specs/release-packaging.md
 * C8; docs/specs/release-additions.md A6 and A12). Each one refuses by name, so the author is
 * pointed at the line in `release.json`, the lesson or the activity that has to change.
 */
import type { LessonSource } from './lessons.js';
import {
  ACTIVITIES_FILE,
  Refusal,
  archiveBase,
  parseJson,
  type SourceRelease,
} from './sourceTree.js';

/** The parts of the previous release's `learning-release.json` a build compares against. */
export interface PreviousRelease {
  readonly version: string;
  readonly lessons: readonly { lesson_id: string; version: string; sha256: string; path: string }[];
  readonly lab_downloads: readonly {
    lab_id: string;
    version: string;
    path: string;
    sha256: string;
  }[];
  readonly activities: { path: string; sha256: string };
}

/**
 * A lesson or kit may be added but never removed (spec A6): learners' answers and kit downloads
 * refer to what a release once carried, and nothing yet decides what removal should mean for them.
 */
export function checkNothingRemoved(
  lessons: readonly LessonSource[],
  release: SourceRelease,
  previous: PreviousRelease,
): void {
  const ids = new Set(lessons.map(({ entry }) => entry.lesson_id));
  for (const lesson of previous.lessons) {
    if (!ids.has(lesson.lesson_id)) {
      throw new Refusal(
        `${lesson.lesson_id} (${lesson.path}) was removed; removing lessons is not supported yet.`,
      );
    }
  }
  for (const lab of previous.lab_downloads) {
    if (!release.labs.some((entry) => entry.lab_id === lab.lab_id)) {
      throw new Refusal(
        `${lab.lab_id} (${lab.path}) was removed; removing kits is not supported yet.`,
      );
    }
  }
}

/**
 * Each kit in `release.json` needs its own `lab_id` and its own archive (spec A12). Archives are
 * compared without letter case, because they become file and folder names, and Windows treats
 * `Kit.zip` and `kit.ZIP` as one file: the second kit would silently overwrite the first.
 */
export function checkLabIdentities(release: SourceRelease): void {
  const seenIds = new Set<string>();
  const seenArchives = new Set<string>();
  for (const lab of release.labs) {
    if (seenIds.has(lab.lab_id)) {
      throw new Refusal(
        `Two kits in release.json share lab_id ${lab.lab_id}; each kit needs its own.`,
      );
    }
    const archive = archiveBase(lab.archive).toLowerCase();
    if (seenArchives.has(archive)) {
      throw new Refusal(
        `Two kits in release.json share archive ${lab.archive} (letter case aside); each kit needs its own file.`,
      );
    }
    seenIds.add(lab.lab_id);
    seenArchives.add(archive);
  }
}

/** A kit serves only lessons the release lists, and names each of them once (spec A12). */
export function checkLabLessons(lessons: readonly LessonSource[], release: SourceRelease): void {
  for (const lab of release.labs) {
    const served = new Set<string>();
    for (const lessonId of lab.lesson_ids) {
      if (served.has(lessonId)) {
        throw new Refusal(`${lab.lab_id} (${lab.archive}) lists ${lessonId} twice in lesson_ids.`);
      }
      served.add(lessonId);
      if (!lessons.some(({ entry }) => entry.lesson_id === lessonId)) {
        throw new Refusal(
          `${lab.lab_id} (${lab.archive}) serves ${lessonId}, which release.json does not list.`,
        );
      }
    }
  }
}

export function checkActivityVersions(activities: Buffer, lessons: readonly LessonSource[]): void {
  const set = parseJson<{ activities?: unknown }>(activities.toString('utf8'), ACTIVITIES_FILE);
  if (!Array.isArray(set.activities)) {
    throw new Refusal(`${ACTIVITIES_FILE} has no activities list.`);
  }
  for (const activity of set.activities as {
    activity_id?: string;
    lesson_id?: string;
    lesson_version?: string;
  }[]) {
    const lesson = lessons.find(({ entry }) => entry.lesson_id === activity.lesson_id);
    if (lesson !== undefined && activity.lesson_version !== lesson.entry.version) {
      throw new Refusal(
        `${activity.activity_id} records lesson version ${activity.lesson_version}, but ${lesson.entry.lesson_id} is now ${lesson.entry.version}.`,
      );
    }
  }
}
