/**
 * Turns a received or built release package into the editable source tree that `buildRelease`
 * reads. Run once per baseline: after this, authors edit the source, never a release.
 *
 * Nothing is dropped silently. Each kit's nested lesson copies are left out because the build
 * injects the canonical lesson — so a copy that differs from the canonical lesson is a refusal,
 * since leaving it out would lose the only record of those bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { verifyRelease } from '../modules/content/verify.js';
import {
  ACTIVITIES_FILE,
  DERIVED_RELEASE_FIELDS,
  GENERATED_PACKAGE_FILES,
  RELEASE_JSON,
  Refusal,
  readJsonFile,
  archiveBase,
  jsonText,
  listFiles,
  stagingDirFor,
  writeFile,
  type SourceRelease,
} from './sourceTree.js';
import { readZip, type ZipEntry } from './zip.js';

export type SeedOutcome =
  { readonly state: 'seeded' } | { readonly state: 'refused'; readonly reason: string };

interface ReceivedManifest {
  readonly lessons: readonly { order: number; lesson_id: string; path: string }[];
  readonly lab_downloads: readonly { lab_id: string; path: string; lesson_ids: string[] }[];
  readonly activities: { path: string };
  readonly [field: string]: unknown;
}

/** Seeds `sourceDir` from the package at `packageDir`, or refuses naming why. */
export function seedSource(packageDir: string, sourceDir: string): SeedOutcome {
  if (fs.existsSync(sourceDir)) {
    return {
      state: 'refused',
      reason: `${sourceDir} already exists; seeding never writes over it.`,
    };
  }
  const contentDir = path.join(packageDir, 'content');
  const verified = verifyRelease(contentDir);
  if (verified.state !== 'verified') {
    return {
      state: 'refused',
      reason: `The package at ${packageDir} does not verify: ${verified.failure.message}`,
    };
  }

  const staging = stagingDirFor(sourceDir);
  try {
    writeSource(packageDir, contentDir, staging, sourceDir);
    fs.renameSync(staging, sourceDir);
    return { state: 'seeded' };
  } catch (error) {
    if (error instanceof Refusal) return { state: 'refused', reason: error.message };
    throw error;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function writeSource(packageDir: string, contentDir: string, out: string, sourceDir: string): void {
  const manifest = readJsonFile<ReceivedManifest>(path.join(contentDir, 'learning-release.json'));
  const packageManifest = readJsonFile<{ package_id: string; read_first: string }>(
    path.join(packageDir, 'package-manifest.json'),
  );
  const lessons = [...manifest.lessons].sort((a, b) => a.order - b.order);
  const lessonBytes = new Map(
    lessons.map((lesson) => [
      lesson.lesson_id,
      fs.readFileSync(path.join(contentDir, lesson.path)),
    ]),
  );

  for (const lesson of lessons) {
    writeFile(
      path.join(out, 'lessons', path.basename(lesson.path)),
      lessonBytes.get(lesson.lesson_id)!,
    );
  }

  for (const lab of manifest.lab_downloads) {
    const archive = path.basename(lab.path);
    let members: ZipEntry[];
    try {
      members = readZip(fs.readFileSync(path.join(contentDir, lab.path)));
    } catch (error) {
      throw new Refusal(`${archive} cannot be read: ${(error as Error).message}`, { cause: error });
    }
    const copies = new Map(
      lab.lesson_ids.map((id) => {
        const lesson = lessons.find((entry) => entry.lesson_id === id)!;
        return [path.basename(lesson.path), lessonBytes.get(id)!] as const;
      }),
    );
    const carried = new Set(members.map((member) => member.path.split('/').slice(1).join('/')));
    const missing = [...copies.keys()].filter((name) => !carried.has(name));
    if (missing.length > 0) {
      throw new Refusal(
        `${archive} serves ${missing.join(', ')} but carries no copy; the build would add one, ` +
          'so the kit could never be reused unchanged.',
      );
    }
    for (const member of members) {
      const [, ...rest] = member.path.split('/');
      const relative = rest.join('/');
      const canonical = copies.get(relative);
      if (canonical !== undefined) {
        if (!member.bytes.equals(canonical)) {
          throw new Refusal(
            `${archive} carries a copy of ${relative} that differs from the canonical lesson; ` +
              'seeding would drop it, and the build would replace it.',
          );
        }
        continue;
      }
      writeFile(path.join(out, 'labs', archiveBase(archive), member.path), member.bytes);
    }
  }

  fs.copyFileSync(path.join(contentDir, manifest.activities.path), path.join(out, ACTIVITIES_FILE));

  for (const file of listFiles(packageDir)) {
    if (file.startsWith('content/')) continue;
    if ((GENERATED_PACKAGE_FILES as readonly string[]).includes(file)) continue;
    writeFile(path.join(out, 'package', file), fs.readFileSync(path.join(packageDir, file)));
  }

  const releaseFields = Object.fromEntries(
    Object.entries(manifest).filter(
      ([field]) => !(DERIVED_RELEASE_FIELDS as readonly string[]).includes(field),
    ),
  ) as SourceRelease['release'];
  const source: SourceRelease = {
    package_id: packageManifest.package_id,
    read_first: packageManifest.read_first,
    previous_release: path.relative(sourceDir, packageDir).split(path.sep).join('/'),
    accepted_feedback: [],
    release: releaseFields,
    lessons: lessons.map((lesson) => path.basename(lesson.path)),
    labs: manifest.lab_downloads.map((lab) => ({
      lab_id: lab.lab_id,
      archive: path.basename(lab.path),
      lesson_ids: lab.lesson_ids,
    })),
  };
  writeFile(path.join(out, RELEASE_JSON), jsonText(source));
}
