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
import {
  checkActivityVersions,
  checkLabIdentities,
  checkLabLessons,
  checkNothingRemoved,
  type PreviousRelease,
} from './buildChecks.js';
import { deriveLessons, type LessonSource } from './lessons.js';
import {
  ACTIVITIES_FILE,
  GENERATED_PACKAGE_FILES,
  RELEASE_JSON,
  Refusal,
  readJsonFile,
  jsonText,
  listFiles,
  stagingDirFor,
  writeFile,
  type SourceRelease,
} from './sourceTree.js';

type Status = 'added' | 'changed' | 'unchanged';

/** An added entry has no previous version or hash, so both are `null` (spec A3). */
interface Transition {
  status: Status;
  previous_version: string | null;
  version: string;
  previous_sha256: string | null;
  sha256: string;
}

export interface ReleaseChanges {
  readonly release_id: string;
  readonly previous_version: string;
  readonly version: string;
  readonly accepted_feedback: readonly string[];
  readonly lessons: readonly ({ lesson_id: string; path: string } & Transition)[];
  readonly labs: readonly ({ lab_id: string; path: string } & Transition)[];
  readonly activities: {
    path: string;
    status: 'changed' | 'unchanged';
    previous_sha256: string;
    sha256: string;
  };
}

export type BuildOutcome =
  | { readonly state: 'built'; readonly changes: ReleaseChanges }
  | { readonly state: 'refused'; readonly reason: string };

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

  checkLabIdentities(release);
  const lessons = deriveLessons(sourceDir, release);
  checkNothingRemoved(lessons, release, previous);
  checkLabLessons(lessons, release);

  const lessonChanges = lessons.map(({ entry, fileName }) => {
    const before = previous.lessons.find((lesson) => lesson.lesson_id === entry.lesson_id);
    if (before === undefined) {
      return {
        lesson_id: entry.lesson_id,
        path: entry.path,
        status: 'added' as Status,
        previous_version: null,
        version: entry.version,
        previous_sha256: null,
        sha256: entry.sha256,
      };
    }
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
    const before = previous.lab_downloads.find((entry) => entry.lab_id === lab.lab_id);
    const copies = new Map(
      lessons
        .filter(({ entry }) => lab.lesson_ids.includes(entry.lesson_id))
        .map(({ fileName, bytes }) => [fileName, bytes] as const),
    );
    const previousKit =
      before === undefined
        ? null
        : readPreviousKit(
            fs.readFileSync(path.join(previousContent, before.path)),
            `${lab.lab_id} (${lab.archive})`,
          );
    return assembleKit(sourceDir, lab, copies, previousKit, modified);
  });
  const labChanges = kits.map((kit) => {
    const before = previous.lab_downloads.find((entry) => entry.lab_id === kit.labId);
    const sha = sha256(kit.zip);
    if (before === undefined) {
      return {
        lab_id: kit.labId,
        path: `labs/${kit.archive}`,
        status: 'added' as Status,
        previous_version: null,
        version: kit.version,
        previous_sha256: null,
        sha256: sha,
      };
    }
    return {
      lab_id: kit.labId,
      path: `labs/${kit.archive}`,
      status: (kit.changed ? 'changed' : 'unchanged') as Status,
      previous_version: before.version,
      version: kit.version,
      previous_sha256: before.sha256,
      sha256: sha,
    };
  });

  const activitySha = sha256(activities);
  const activitiesChanged = activitySha !== previous.activities.sha256;
  const anything =
    activitiesChanged ||
    lessonChanges.some((lesson) => lesson.status !== 'unchanged') ||
    labChanges.some((lab) => lab.status !== 'unchanged');
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
