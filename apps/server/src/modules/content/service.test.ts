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

  it('imports the release the author supplied, thirteen lessons in authored order', () => {
    db = openDatabase(':memory:');

    const state = importRelease(db, loadConfig().releaseDir);

    expect(state.state).toBe('imported');
    if (state.state !== 'imported') return;
    const summary = loadReleaseSummary(db, state.releaseRowId);
    expect(summary?.releaseId).toBe('FSSE-HTTP-FIRST-THIRTEEN');
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
    ]);
  });

  /**
   * Criterion C3 in docs/specs/content-release-first-thirteen.md, with the two real releases: the
   * record store an owner has been studying from is the one the thirteen-release lands beside.
   */
  it('imports the thirteen-release beside an already-imported first-five, touching nothing', () => {
    db = openDatabase(':memory:');
    const firstFiveDir = path.join(
      repoRoot,
      'content',
      'releases',
      'vs-code-first-five-v1',
      'content',
    );

    const firstFive = importRelease(db, firstFiveDir);
    expect(firstFive.state).toBe('imported');
    if (firstFive.state !== 'imported') return;

    const thirteen = importRelease(db, loadConfig().releaseDir);
    expect(thirteen.state).toBe('imported');
    if (thirteen.state !== 'imported') return;

    // A second release, not a rewrite of the first: the earlier rows still answer for themselves.
    expect(thirteen.releaseRowId).not.toBe(firstFive.releaseRowId);
    const earlier = loadReleaseSummary(db, firstFive.releaseRowId);
    expect(earlier?.releaseId).toBe('FSSE-HTTP-FIRST-FIVE');
    expect(earlier?.lessons).toHaveLength(5);

    // Five rows plus thirteen: nothing merged, nothing replaced, nothing deleted.
    const rows = db.prepare('SELECT count(*) AS n FROM content_lesson').get() as { n: number };
    expect(rows.n).toBe(18);

    // Verify-on-every-start stays cheap: the identical release lands on its existing row.
    expect(importRelease(db, loadConfig().releaseDir)).toEqual(thirteen);
  });
});
