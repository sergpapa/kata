import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { importRelease } from './service.js';
import { loadReleaseSummary } from './repository.js';
import { openDatabase, type Db } from '../lifecycle/database.js';
import { loadConfig, repoRoot } from '../../config.js';
import { makeFixture, makeTempDir, removeDir, writeFixture } from './testkit/releaseFixture.js';

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

describe('importing a release into the record store', () => {
  it('stores a verified release and points at what it stored', () => {
    db = openDatabase(':memory:');
    const dir = makeTempDir();
    tempDirs.push(dir);
    writeFixture(dir, makeFixture());

    const state = importRelease(db, dir);

    expect(state.state).toBe('imported');
    if (state.state !== 'imported') return;
    expect(loadReleaseSummary(db, state.releaseRowId)?.lessons).toHaveLength(2);
  });

  it('writes nothing when the release is refused, and reports the named reason', () => {
    db = openDatabase(':memory:');
    const dir = makeTempDir();
    tempDirs.push(dir);
    const fixture = makeFixture();
    fixture.files.delete('lessons/lesson-02.md');
    writeFixture(dir, fixture);

    const state = importRelease(db, dir);

    expect(state.state).toBe('failed');
    if (state.state !== 'failed') return;
    expect(state.failure.code).toBe('file_missing');
    expect(state.failure.file).toBe('lessons/lesson-02.md');
    const rows = db.prepare('SELECT count(*) AS n FROM content_lesson').get() as { n: number };
    expect(rows.n).toBe(0);
  });

  it('imports the release the author supplied, fifteen lessons in authored order', () => {
    db = openDatabase(':memory:');

    const state = importRelease(db, loadConfig({}).releaseDir);

    expect(state.state).toBe('imported');
    if (state.state !== 'imported') return;
    const summary = loadReleaseSummary(db, state.releaseRowId);
    expect(summary?.releaseId).toBe('FSSE-HTTP-FIRST-FIFTEEN');
    expect(summary?.lessons.map((lesson) => lesson.candidateLessonId)).toEqual([
      'LS-M020-01',
      'LS-M020-02',
      'LS-M020-03',
      'LS-M020-04',
      'LS-M020-05',
      'LS-M020-06',
      'LS-M020-07',
      'LS-M020-08',
      'LS-M021-01',
      'LS-M021-02',
      'LS-M021-03',
      'LS-M021-04',
      'LS-M021-05',
      'LS-M021-06',
      'LS-M021-07',
    ]);
  });

  /**
   * Criterion C3 in docs/specs/content-release-corrections-101.md, with the four real releases:
   * the record store of an owner who followed the whole chain — first-five, thirteen, fifteen
   * 1.0.0 — is the one the corrected reissue lands beside. Old rows keep old versions; that is how
   * a historical attempt retains the provenance it recorded.
   */
  it('imports the 1.0.1 correction beside the three already-imported releases, touching nothing', () => {
    db = openDatabase(':memory:');
    const chain = [
      ['vs-code-first-five-v1', 'FSSE-HTTP-FIRST-FIVE', 5],
      ['http-lessons-09-13-release-v1', 'FSSE-HTTP-FIRST-THIRTEEN', 13],
      ['http-lessons-14-15-release-v1', 'FSSE-HTTP-FIRST-FIFTEEN', 15],
    ] as const;

    const rowIds: number[] = [];
    for (const [dir] of chain) {
      const state = importRelease(db, path.join(repoRoot, 'content', 'releases', dir, 'content'));
      expect(state.state).toBe('imported');
      if (state.state !== 'imported') return;
      rowIds.push(state.releaseRowId);
    }

    const corrected = importRelease(db, loadConfig({}).releaseDir);
    expect(corrected.state).toBe('imported');
    if (corrected.state !== 'imported') return;

    // A fourth release, not a rewrite of the earlier three: their rows still answer for
    // themselves — including the superseded 1.0.0 bytes of lessons 2 and 7.
    expect(new Set([...rowIds, corrected.releaseRowId]).size).toBe(4);
    chain.forEach(([, releaseId, lessonCount], index) => {
      const summary = loadReleaseSummary(db, rowIds[index] as number);
      expect(summary?.releaseId).toBe(releaseId);
      expect(summary?.lessons).toHaveLength(lessonCount);
    });

    // 5 + 13 + 15 + 15 rows: nothing merged, nothing replaced, nothing deleted.
    const rows = db.prepare('SELECT count(*) AS n FROM content_lesson').get() as { n: number };
    expect(rows.n).toBe(48);

    // Verify-on-every-start stays cheap: the identical release lands on its existing row.
    expect(importRelease(db, loadConfig({}).releaseDir)).toEqual(corrected);
  });
});
