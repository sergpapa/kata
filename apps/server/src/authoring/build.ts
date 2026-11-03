/**
 * Builds a cumulative release package from the source tree (ADR 0013; spec
 * docs/specs/release-packaging.md). Every hash is computed, never typed; every rule the importer
 * does not enforce — honest kit manifests, versions that move with bytes, activities that follow
 * their lessons — is enforced here; and the result must pass the app's own `verifyRelease` before
 * it is allowed to exist under its final name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { verifyRelease } from '../modules/content/verify.js';
import { assembleKit, readPreviousKit, sha256, type AssembledKit } from './kits.js';
import { deriveLessons, type LessonSource } from './lessons.js';
import {
  ACTIVITIES_FILE,
  GENERATED_PACKAGE_FILES,
  RELEASE_JSON,
  Refusal,
  parseJson,
  readJsonFile,
  jsonText,
  listFiles,
  stagingDirFor,
  writeFile,
  type SourceRelease,
} from './sourceTree.js';

type Status = 'changed' | 'unchanged';

interface Transition {
  status: Status;
  previous_version: string;
  version: string;
  previous_sha256: string;
  sha256: string;
}

export interface ReleaseChanges {
  readonly release_id: string;
  readonly previous_version: string;
  readonly version: string;
  readonly accepted_feedback: readonly string[];
  readonly lessons: readonly ({ lesson_id: string; path: string } & Transition)[];
  readonly labs: readonly ({ lab_id: string; path: string } & Transition)[];
  readonly activities: { path: string; status: Status; previous_sha256: string; sha256: string };
}

export type BuildOutcome =
  | { readonly state: 'built'; readonly changes: ReleaseChanges }
  | { readonly state: 'refused'; readonly reason: string };

interface PreviousRelease {
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

/** Builds `outDir` from `sourceDir`, or refuses naming why and leaves nothing behind. */
export function buildRelease(sourceDir: string, outDir: string): BuildOutcome {
  if (fs.existsSync(outDir)) {
    return {
      state: 'refused',
      reason: `${outDir} already exists; a release is never overwritten.`,
    };
  }
  let staging: string | undefined;
  try {
    const plan = planRelease(sourceDir);
    staging = stagingDirFor(outDir);
    writePackage(sourceDir, plan, staging);
    fs.renameSync(staging, outDir);
    return { state: 'built', changes: plan.changes };
  } catch (error) {
    if (error instanceof Refusal) return { state: 'refused', reason: error.message };
    throw error;
  } finally {
    if (staging !== undefined) fs.rmSync(staging, { recursive: true, force: true });
  }
}

interface Plan {
  readonly release: SourceRelease;
  readonly lessons: readonly LessonSource[];
  readonly kits: readonly AssembledKit[];
  readonly activities: Buffer;
  readonly changes: ReleaseChanges;
}

/** Everything that can refuse, decided before a single output byte is written. */
function planRelease(sourceDir: string): Plan {
  const release = readJsonFile<SourceRelease>(path.join(sourceDir, RELEASE_JSON));
  const previousDir = path.resolve(sourceDir, release.previous_release);
  const previousContent = path.join(previousDir, 'content');
  if (verifyRelease(previousContent).state !== 'verified') {
    throw new Refusal(
      `The previous release at ${previousDir} does not verify, so nothing can be compared with it.`,
    );
  }
  const previous = readJsonFile<PreviousRelease>(
    path.join(previousContent, 'learning-release.json'),
  );

  const lessons = deriveLessons(sourceDir, release);
  checkSameScope(lessons, release, previous);

  const lessonChanges = lessons.map(({ entry, fileName }) => {
    const before = previous.lessons.find((lesson) => lesson.lesson_id === entry.lesson_id)!;
    const changed = before.sha256 !== entry.sha256;
    if (changed && before.version === entry.version) {
      throw new Refusal(
        `${fileName} changed but its version is still ${entry.version}; move it before reissuing the lesson.`,
      );
    }
    return {
      lesson_id: entry.lesson_id,
      path: entry.path,
      status: (changed ? 'changed' : 'unchanged') as Status,
      previous_version: before.version,
      version: entry.version,
      previous_sha256: before.sha256,
      sha256: entry.sha256,
    };
  });

  const activities = fs.readFileSync(path.join(sourceDir, ACTIVITIES_FILE));
  checkActivityVersions(activities, lessons);

  const modified = new Date(`${release.release.date}T00:00:00Z`);
  const year = modified.getUTCFullYear();
  if (Number.isNaN(year) || year < 1980 || year > 2107) {
    throw new Refusal(
      `release.json's release.date ${release.release.date} is not a YYYY-MM-DD date a zip can record (1980 to 2107).`,
    );
  }
  const kits = release.labs.map((lab) => {
    const before = previous.lab_downloads.find((entry) => entry.lab_id === lab.lab_id)!;
    const copies = new Map(
      lessons
        .filter(({ entry }) => lab.lesson_ids.includes(entry.lesson_id))
        .map(({ fileName, bytes }) => [fileName, bytes] as const),
    );
    const previousKit = readPreviousKit(
      fs.readFileSync(path.join(previousContent, before.path)),
      `${lab.lab_id} (${lab.archive})`,
    );
    return assembleKit(sourceDir, lab, copies, previousKit, modified);
  });
  const labChanges = kits.map((kit) => {
    const before = previous.lab_downloads.find((entry) => entry.lab_id === kit.labId)!;
    return {
      lab_id: kit.labId,
      path: `labs/${kit.archive}`,
      status: (kit.changed ? 'changed' : 'unchanged') as Status,
      previous_version: before.version,
      version: kit.version,
      previous_sha256: before.sha256,
      sha256: sha256(kit.zip),
    };
  });

  const activitySha = sha256(activities);
  const activitiesChanged = activitySha !== previous.activities.sha256;
  const anything =
    activitiesChanged ||
    lessonChanges.some((lesson) => lesson.status === 'changed') ||
    labChanges.some((lab) => lab.status === 'changed');
  if (!anything) {
    throw new Refusal(
      'Nothing to release: no lesson, kit or activity byte differs from the previous release.',
    );
  }
  if (release.release.version === previous.version) {
    throw new Refusal(
      `The release version is still ${previous.version}, the previous release's; move release.version in release.json.`,
    );
  }

  return {
    release,
    lessons,
    kits,
    activities,
    changes: {
      release_id: release.release.release_id,
      previous_version: previous.version,
      version: release.release.version,
      accepted_feedback: release.accepted_feedback,
      lessons: lessonChanges,
      labs: labChanges,
      activities: {
        path: ACTIVITIES_FILE,
        status: activitiesChanged ? 'changed' : 'unchanged',
        previous_sha256: previous.activities.sha256,
        sha256: activitySha,
      },
    },
  };
}

/** Adding or removing a lesson or kit is a later slice (Lesson 16); refuse it by name here. */
function checkSameScope(
  lessons: readonly LessonSource[],
  release: SourceRelease,
  previous: PreviousRelease,
): void {
  const ids = new Set(lessons.map(({ entry }) => entry.lesson_id));
  for (const { entry, fileName } of lessons) {
    if (!previous.lessons.some((lesson) => lesson.lesson_id === entry.lesson_id)) {
      throw new Refusal(
        `${fileName} (${entry.lesson_id}) is a new lesson; adding lessons is not supported yet.`,
      );
    }
  }
  for (const lesson of previous.lessons) {
    if (!ids.has(lesson.lesson_id)) {
      throw new Refusal(
        `${lesson.lesson_id} (${lesson.path}) was removed; removing lessons is not supported yet.`,
      );
    }
  }
  for (const lab of release.labs) {
    if (!previous.lab_downloads.some((entry) => entry.lab_id === lab.lab_id)) {
      throw new Refusal(
        `${lab.lab_id} (${lab.archive}) is a new kit; adding kits is not supported yet.`,
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

function checkActivityVersions(activities: Buffer, lessons: readonly LessonSource[]): void {
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

function writePackage(sourceDir: string, plan: Plan, out: string): void {
  const content = path.join(out, 'content');
  for (const { fileName, bytes } of plan.lessons)
    writeFile(path.join(content, 'lessons', fileName), bytes);
  for (const kit of plan.kits) writeFile(path.join(content, 'labs', kit.archive), kit.zip);
  writeFile(path.join(content, ACTIVITIES_FILE), plan.activities);
  writeFile(path.join(content, 'learning-release.json'), jsonText(learningRelease(plan)));

  const packageSource = path.join(sourceDir, 'package');
  for (const file of fs.existsSync(packageSource) ? listFiles(packageSource) : []) {
    if (
      (GENERATED_PACKAGE_FILES as readonly string[]).includes(file) ||
      file.startsWith('content/')
    ) {
      throw new Refusal(`package/${file} would overwrite a file the build writes itself.`);
    }
    writeFile(path.join(out, file), fs.readFileSync(path.join(packageSource, file)));
  }
  writeFile(path.join(out, 'release-changes.json'), jsonText(plan.changes));

  const verified = verifyRelease(content);
  if (verified.state !== 'verified') {
    throw new Refusal(`The built release does not verify: ${verified.failure.message}`);
  }
  writeFile(
    path.join(out, 'package-verification.json'),
    jsonText({
      date: plan.release.release.date,
      release_id: plan.changes.release_id,
      release_version: plan.changes.version,
      importer_verification: 'passed',
      checks_run: [
        'importer_verification',
        'nested_lesson_copies_match_canonical',
        'all_hashes_recomputed',
      ],
      not_run_by_this_tool: ['mermaid_parse_and_render', 'browser_rehearsal', 'kit_runtime_suites'],
    }),
  );
  writeFile(
    path.join(out, 'package-manifest.json'),
    jsonText({
      package_id: plan.release.package_id,
      version: plan.changes.version,
      date: plan.release.release.date,
      read_first: plan.release.read_first,
      release_manifest: 'content/learning-release.json',
      files: listFiles(out).map((file) => ({
        path: file,
        sha256: sha256(fs.readFileSync(path.join(out, file))),
      })),
    }),
  );
}

/** The release-level fields in their authored order, with the derived lists after `lesson_key_field`. */
function learningRelease(plan: Plan): Record<string, unknown> {
  const derived = {
    lessons: plan.lessons.map(({ entry }) => entry),
    lab_downloads: plan.kits.map((kit) => ({
      lab_id: kit.labId,
      version: kit.version,
      path: `labs/${kit.archive}`,
      sha256: sha256(kit.zip),
      lesson_ids: plan.release.labs.find((lab) => lab.lab_id === kit.labId)!.lesson_ids,
    })),
    activities: { path: ACTIVITIES_FILE, sha256: plan.changes.activities.sha256 },
  };
  const out: Record<string, unknown> = {};
  let placed = false;
  for (const [field, value] of Object.entries(plan.release.release)) {
    out[field] = value;
    if (field === 'lesson_key_field') {
      Object.assign(out, derived);
      placed = true;
    }
  }
  return placed ? out : { ...out, ...derived };
}
