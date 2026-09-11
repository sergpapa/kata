import { afterEach, describe, expect, it } from 'vitest';
import { loadReleaseSummary, saveRelease } from './repository.js';
import { verifyRelease } from './verify.js';
import type { VerifiedRelease } from './types.js';
import { openDatabase, type Db } from '../lifecycle/database.js';
import {
  lessonSource,
  makeFixture,
  makeTempDir,
  removeDir,
  replaceLessonFile,
  writeFixture,
  type Fixture,
} from './testkit/releaseFixture.js';

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

function verified(fixture: Fixture = makeFixture()): VerifiedRelease {
  const dir = makeTempDir();
  tempDirs.push(dir);
  const outcome = verifyRelease(writeFixture(dir, fixture));
  if (outcome.state !== 'verified') {
    throw new Error(`The fixture should verify, but it was refused: ${outcome.failure.message}`);
  }
  return outcome.release;
}

/** Row counts across the content tables, so "nothing was written" is one readable assertion. */
function contentRowCounts(database: Db): Record<string, number> {
  const tables = ['content_release', 'content_lesson', 'content_lab_kit', 'content_activity_set'];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    counts[table] = (
      database.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }
    ).n;
  }
  return counts;
}

describe('storing a verified release', () => {
  it('keeps the lessons in manifest order with the keys later work hangs off', () => {
    db = openDatabase(':memory:');
    const releaseRowId = saveRelease(db, verified());

    const summary = loadReleaseSummary(db, releaseRowId);

    expect(summary?.releaseId).toBe('FIX-RELEASE');
    expect(summary?.version).toBe('1.0.0-draft');
    expect(summary?.date).toBe('2026-09-11');
    expect(summary?.status).toBe('owner-review candidate');
    expect(summary?.audience).toBe('Fixture');
    expect(summary?.lessons).toEqual([
      {
        order: 1,
        candidateLessonId: 'FIX-LS-01',
        contentVersion: '1.0.0-draft',
        documentId: 'FIX-DOC-01',
        module: 'M020',
        displayTitle: 'Lesson 1: the authored title',
        manifestTitle: 'Lesson 1 as the manifest names it',
        sourcePath: 'lessons/lesson-01.md',
        sha256: expect.any(String) as unknown as string,
        labId: null,
      },
      {
        order: 2,
        candidateLessonId: 'FIX-LS-02',
        contentVersion: '1.0.0-draft',
        documentId: 'FIX-DOC-02',
        module: 'M020',
        displayTitle: 'Lesson 2: the authored title',
        manifestTitle: 'Lesson 2 as the manifest names it',
        sourcePath: 'lessons/lesson-02.md',
        sha256: expect.any(String) as unknown as string,
        labId: 'FIX-LAB-02',
      },
    ]);
  });

  it('keeps the lesson source text and the authored front matter, not just the metadata', () => {
    db = openDatabase(':memory:');
    const release = verified();
    saveRelease(db, release);

    // The repository's own test is the one place that may read the schema directly.
    const row = db
      .prepare(
        'SELECT source_text, front_matter_json FROM content_lesson WHERE candidate_lesson_id = ?',
      )
      .get('FIX-LS-01') as { source_text: string; front_matter_json: string };

    expect(row.source_text).toBe(release.lessons[0]?.sourceText);
    expect(JSON.parse(row.front_matter_json)).toMatchObject({
      document_id: 'FIX-DOC-01',
      prerequisites: ['Has opened a web page'],
    });
  });

  it('keeps each lab kit by reference, with the hash and size that were verified', () => {
    db = openDatabase(':memory:');
    const release = verified();
    saveRelease(db, release);

    const row = db
      .prepare('SELECT lab_id, lab_version, source_path, sha256, byte_size FROM content_lab_kit')
      .get() as Record<string, unknown>;

    expect(row).toEqual({
      lab_id: 'FIX-LAB-02',
      lab_version: '1.0.0-draft',
      source_path: 'labs/kit-02.zip',
      sha256: release.labKits[0]?.sha256,
      byte_size: release.labKits[0]?.byteSize,
    });
  });

  it('keeps the activity file text and hash, so Milestone 2 reads what was imported', () => {
    db = openDatabase(':memory:');
    const release = verified();
    saveRelease(db, release);

    const row = db
      .prepare('SELECT source_path, sha256, source_text FROM content_activity_set')
      .get() as Record<string, unknown>;

    expect(row).toEqual({
      source_path: 'trial-activities.json',
      sha256: release.activitySet.sha256,
      source_text: release.activitySet.sourceText,
    });
  });

  it('keeps the manifest hash the release was verified against', () => {
    db = openDatabase(':memory:');
    const release = verified();

    const summary = loadReleaseSummary(db, saveRelease(db, release));

    expect(summary?.manifestSha256).toBe(release.manifestSha256);
  });

  it('records when the release was imported', () => {
    db = openDatabase(':memory:');
    const before = new Date().toISOString();

    const summary = loadReleaseSummary(db, saveRelease(db, verified()));

    expect(summary?.importedAt >= before).toBe(true);
  });
});

describe('importing the same release twice', () => {
  it('adds no rows and returns the release that is already stored', () => {
    db = openDatabase(':memory:');
    const first = saveRelease(db, verified());
    const countsAfterFirst = contentRowCounts(db);

    const second = saveRelease(db, verified());

    expect(second).toBe(first);
    expect(contentRowCounts(db)).toEqual(countsAfterFirst);
  });

  it('leaves the stored lesson rows themselves in place, rather than replacing them', () => {
    db = openDatabase(':memory:');
    saveRelease(db, verified());
    const before = db
      .prepare('SELECT rowid, candidate_lesson_id FROM content_lesson ORDER BY rowid')
      .all();

    saveRelease(db, verified());

    expect(
      db.prepare('SELECT rowid, candidate_lesson_id FROM content_lesson ORDER BY rowid').all(),
    ).toEqual(before);
  });

  it('leaves the first import time untouched', () => {
    db = openDatabase(':memory:');
    const releaseRowId = saveRelease(db, verified());
    const firstImportedAt = loadReleaseSummary(db, releaseRowId)?.importedAt;

    saveRelease(db, verified());

    expect(loadReleaseSummary(db, releaseRowId)?.importedAt).toBe(firstImportedAt);
  });
});

describe('importing a revised lesson', () => {
  it('never overwrites the rows an earlier prediction was recorded against', () => {
    db = openDatabase(':memory:');
    const original = saveRelease(db, verified());

    const revised = makeFixture();
    replaceLessonFile(
      revised,
      'lessons/lesson-02.md',
      lessonSource(
        [
          'document_id: FIX-DOC-02',
          'version: "2.0.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-02',
        ].join('\n'),
        '# Lesson 2: the revised title\n\nRewritten prose.',
      ),
    );
    (revised.manifest.lessons[1] as { version: string }).version = '2.0.0-draft';
    const updated = saveRelease(db, verified(revised));

    expect(updated).not.toBe(original);
    const before = loadReleaseSummary(db, original);
    const after = loadReleaseSummary(db, updated);
    expect(before?.lessons[1]?.contentVersion).toBe('1.0.0-draft');
    expect(before?.lessons[1]?.displayTitle).toBe('Lesson 2: the authored title');
    expect(after?.lessons[1]?.contentVersion).toBe('2.0.0-draft');
    expect(after?.lessons[1]?.displayTitle).toBe('Lesson 2: the revised title');
  });
});

describe('a write that cannot complete', () => {
  it('leaves the record store exactly as it was, rather than half a release', () => {
    db = openDatabase(':memory:');
    const release = verified();
    const broken: VerifiedRelease = {
      ...release,
      lessons: [
        release.lessons[0] as (typeof release.lessons)[number],
        release.lessons[0] as (typeof release.lessons)[number],
      ],
    };

    expect(() => saveRelease(db as Db, broken)).toThrow();
    expect(contentRowCounts(db)).toEqual({
      content_release: 0,
      content_lesson: 0,
      content_lab_kit: 0,
      content_activity_set: 0,
    });
  });
});
