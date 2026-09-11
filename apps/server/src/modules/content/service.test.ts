import { afterEach, describe, expect, it } from 'vitest';
import { importRelease } from './service.js';
import { loadReleaseSummary } from './repository.js';
import { openDatabase, type Db } from '../lifecycle/database.js';
import { loadConfig } from '../../config.js';
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

  it('imports the release the author supplied, five lessons in authored order', () => {
    db = openDatabase(':memory:');

    const state = importRelease(db, loadConfig().releaseDir);

    expect(state.state).toBe('imported');
    if (state.state !== 'imported') return;
    const summary = loadReleaseSummary(db, state.releaseRowId);
    expect(summary?.releaseId).toBe('FSSE-HTTP-FIRST-FIVE');
    expect(summary?.lessons.map((lesson) => lesson.candidateLessonId)).toEqual([
      'LS-M020-01',
      'LS-M020-02',
      'LS-M020-03',
      'LS-M020-04',
      'LS-M020-05',
    ]);
  });
});
