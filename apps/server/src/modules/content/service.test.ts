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
   * Criterion C3 in docs/specs/content-release-first-fifteen.md, with the three real releases: the
   * record store of an owner who followed the whole chain — first-five, then thirteen — is the one
   * the fifteen-release lands beside.
   */
  it('imports the fifteen-release beside the two already-imported releases, touching nothing', () => {
    db = openDatabase(':memory:');
    const firstFiveDir = path.join(
      repoRoot,
      'content',
      'releases',
      'vs-code-first-five-v1',
      'content',
    );
    const thirteenDir = path.join(
      repoRoot,
      'content',
      'releases',
      'http-lessons-09-13-release-v1',
      'content',
    );

    const firstFive = importRelease(db, firstFiveDir);
    expect(firstFive.state).toBe('imported');
    if (firstFive.state !== 'imported') return;

    const thirteen = importRelease(db, thirteenDir);
    expect(thirteen.state).toBe('imported');
    if (thirteen.state !== 'imported') return;

    const fifteen = importRelease(db, loadConfig({}).releaseDir);
    expect(fifteen.state).toBe('imported');
    if (fifteen.state !== 'imported') return;

    // A third release, not a rewrite of the earlier two: their rows still answer for themselves.
    expect(
      new Set([firstFive.releaseRowId, thirteen.releaseRowId, fifteen.releaseRowId]).size,
    ).toBe(3);
    expect(loadReleaseSummary(db, firstFive.releaseRowId)?.releaseId).toBe('FSSE-HTTP-FIRST-FIVE');
    expect(loadReleaseSummary(db, firstFive.releaseRowId)?.lessons).toHaveLength(5);
    expect(loadReleaseSummary(db, thirteen.releaseRowId)?.releaseId).toBe(
      'FSSE-HTTP-FIRST-THIRTEEN',
    );
    expect(loadReleaseSummary(db, thirteen.releaseRowId)?.lessons).toHaveLength(13);

    // Five rows plus thirteen plus fifteen: nothing merged, nothing replaced, nothing deleted.
    const rows = db.prepare('SELECT count(*) AS n FROM content_lesson').get() as { n: number };
    expect(rows.n).toBe(33);

    // Verify-on-every-start stays cheap: the identical release lands on its existing row.
    expect(importRelease(db, loadConfig({}).releaseDir)).toEqual(fifteen);
  });
});
