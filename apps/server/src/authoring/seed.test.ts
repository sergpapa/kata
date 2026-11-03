import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { seedSource } from './seed.js';
import { readZip, writeZip } from './zip.js';
import {
  REAL_CONTENT,
  REAL_PACKAGE,
  cleanTemps,
  kitFolder,
  listFiles,
  seededSource,
  sha256,
  tempDir,
  type SourceRelease,
} from './testkit/sourceFixture.js';

afterEach(cleanTemps);

interface ReleaseManifest {
  version: string;
  lessons: { order: number; lesson_id: string; path: string; lab_id: string | null }[];
  lab_downloads: { lab_id: string; path: string; sha256: string; lesson_ids: string[] }[];
}

const realManifest = () =>
  JSON.parse(
    fs.readFileSync(path.join(REAL_CONTENT, 'learning-release.json'), 'utf8'),
  ) as ReleaseManifest;

describe('seeding a source tree from the current release (C1)', () => {
  it('copies every lesson and the activity file byte for byte', () => {
    const source = seededSource();
    for (const lesson of realManifest().lessons) {
      const name = path.basename(lesson.path);
      const seeded = fs.readFileSync(path.join(source, 'lessons', name));
      expect(seeded.equals(fs.readFileSync(path.join(REAL_CONTENT, lesson.path))), name).toBe(true);
    }
    expect(
      fs
        .readFileSync(path.join(source, 'trial-activities.json'))
        .equals(fs.readFileSync(path.join(REAL_CONTENT, 'trial-activities.json'))),
    ).toBe(true);
  });

  it('unpacks each kit without its nested lesson copies, every other member byte for byte', () => {
    const source = seededSource();
    for (const lab of realManifest().lab_downloads) {
      const archiveBase = path.basename(lab.path, '.zip');
      const members = readZip(fs.readFileSync(path.join(REAL_CONTENT, lab.path)));
      const folder = kitFolder(source, archiveBase);
      const inner = path.basename(folder);
      const lessonCopies = new Set(
        realManifest()
          .lessons.filter((lesson) => lab.lesson_ids.includes(lesson.lesson_id))
          .map((lesson) => `${inner}/${path.basename(lesson.path)}`),
      );

      const expected = members
        .filter((member) => !lessonCopies.has(member.path))
        .map((member) => member.path.slice(inner.length + 1))
        .sort();
      expect(listFiles(folder), archiveBase).toEqual(expected);
      for (const member of members.filter((candidate) => !lessonCopies.has(candidate.path))) {
        const onDisk = fs.readFileSync(path.join(source, 'labs', archiveBase, member.path));
        expect(sha256(onDisk), member.path).toBe(sha256(member.bytes));
      }
    }
  });

  it('records lesson order, kits and the previous release in release.json', () => {
    const source = seededSource();
    const release = JSON.parse(
      fs.readFileSync(path.join(source, 'release.json'), 'utf8'),
    ) as SourceRelease;
    const manifest = realManifest();

    expect(release.release.version).toBe('1.0.1-draft');
    expect(release.lessons).toEqual(
      [...manifest.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson) => path.basename(lesson.path)),
    );
    expect(release.labs).toEqual(
      manifest.lab_downloads.map((lab) => ({
        lab_id: lab.lab_id,
        archive: path.basename(lab.path),
        lesson_ids: lab.lesson_ids,
      })),
    );
    expect(path.resolve(source, release.previous_release as string)).toBe(REAL_PACKAGE);
  });

  it('records the package identity, an empty feedback list and every release-level field', () => {
    const source = seededSource();
    const release = JSON.parse(
      fs.readFileSync(path.join(source, 'release.json'), 'utf8'),
    ) as SourceRelease;
    const packageManifest = JSON.parse(
      fs.readFileSync(path.join(REAL_PACKAGE, 'package-manifest.json'), 'utf8'),
    ) as { package_id: string; read_first: string };
    const learning = JSON.parse(
      fs.readFileSync(path.join(REAL_CONTENT, 'learning-release.json'), 'utf8'),
    ) as Record<string, unknown>;
    const releaseLevel = Object.entries(learning).filter(
      ([field]) => !['lessons', 'lab_downloads', 'activities'].includes(field),
    );

    expect(release.package_id).toBe(packageManifest.package_id);
    expect(release.read_first).toBe(packageManifest.read_first);
    expect(release.accepted_feedback).toEqual([]);
    expect(Object.entries(release.release)).toEqual(releaseLevel);
  });

  it('copies every authored package document byte for byte and no generated one', () => {
    const source = seededSource();
    const generated = [
      'package-manifest.json',
      'package-verification.json',
      'release-changes.json',
    ];
    const authored = listFiles(REAL_PACKAGE).filter(
      (file) => !file.startsWith('content/') && !generated.includes(file),
    );
    expect(authored.length).toBeGreaterThan(10);
    expect(listFiles(path.join(source, 'package'))).toEqual(authored);
    for (const file of authored) {
      const seeded = fs.readFileSync(path.join(source, 'package', file));
      expect(seeded.equals(fs.readFileSync(path.join(REAL_PACKAGE, file))), file).toBe(true);
    }
  });
});

describe('seeding refuses rather than loses (C2)', () => {
  /** A full copy of the real package that the test may damage. */
  function copyOfRealPackage(): string {
    const copy = path.join(tempDir(), 'package');
    fs.cpSync(REAL_PACKAGE, copy, { recursive: true });
    return copy;
  }

  it('refuses a release that does not verify, naming the file', () => {
    const copy = copyOfRealPackage();
    const lesson = path.join(copy, 'content/lessons/HTTP_Lesson_05_Student_Edition_v1.md');
    fs.appendFileSync(lesson, '\nAn unrecorded edit.\n');

    const outcome = seedSource(copy, path.join(tempDir(), 'source'));
    expect(outcome.state).toBe('refused');
    if (outcome.state === 'refused') expect(outcome.reason).toMatch(/HTTP_Lesson_05/);
  });

  it('refuses a kit whose nested lesson copy differs from the canonical lesson', () => {
    const copy = copyOfRealPackage();
    const kitPath = path.join(copy, 'content/labs/HTTP_Lesson_02_Local_Server_Kit_v1.zip');
    const members = readZip(fs.readFileSync(kitPath)).map((member) =>
      member.path.endsWith('HTTP_Lesson_02_Student_Edition_v1.md')
        ? { path: member.path, bytes: Buffer.concat([member.bytes, Buffer.from('\ndrift\n')]) }
        : member,
    );
    const damaged = writeZip(members, new Date(Date.UTC(2026, 8, 21)));
    fs.writeFileSync(kitPath, damaged);
    const manifestPath = path.join(copy, 'content/learning-release.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ReleaseManifest;
    manifest.lab_downloads[0]!.sha256 = sha256(damaged);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const outcome = seedSource(copy, path.join(tempDir(), 'source'));
    expect(outcome.state).toBe('refused');
    if (outcome.state === 'refused') {
      expect(outcome.reason).toMatch(/HTTP_Lesson_02_Student_Edition_v1\.md/);
      expect(outcome.reason).toMatch(/HTTP_Lesson_02_Local_Server_Kit_v1/);
    }
  });

  it('refuses a target directory that already exists, leaving it untouched', () => {
    const target = path.join(tempDir(), 'source');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'keep.txt'), 'mine');

    const outcome = seedSource(REAL_PACKAGE, target);
    expect(outcome.state).toBe('refused');
    expect(listFiles(target)).toEqual(['keep.txt']);
  });
});
