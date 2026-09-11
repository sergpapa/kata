import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { migrate, openDatabase, readSchemaVersion, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';
import type { ReleaseState } from './modules/content/types.js';
import {
  makeFixture,
  makeTempDir,
  removeDir,
  writeFixture,
} from './modules/content/testkit/releaseFixture.js';

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

function releaseDir(mutate: (fixture: ReturnType<typeof makeFixture>) => void = () => {}): string {
  const dir = makeTempDir();
  tempDirs.push(dir);
  const fixture = makeFixture();
  mutate(fixture);
  return writeFixture(dir, fixture);
}

describe('the walking skeleton', () => {
  it('answers /api/health with the schema version actually stored in the database', async () => {
    db = openDatabase(':memory:');
    const release: ReleaseState = importRelease(db, releaseDir());
    const app = buildApp({ db, release });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', schemaVersion: '2' });
    await app.close();
  });

  it('applies each migration once, so restarting the app does not re-seed the database', () => {
    db = openDatabase(':memory:');
    migrate(db);
    migrate(db);

    const rows = db.prepare('SELECT count(*) AS n FROM schema_meta').get() as { n: number };
    expect(rows.n).toBe(1);
    expect(readSchemaVersion(db)).toBe('2');
  });
});

describe('GET /api/release after a verified import', () => {
  it('reports the release identity and every lesson in authored order', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/release' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Record<string, unknown>;
    expect(body.state).toBe('imported');
    expect(body.release).toMatchObject({
      releaseId: 'FIX-RELEASE',
      version: '1.0.0-draft',
      date: '2026-09-11',
      status: 'owner-review candidate',
      audience: 'Fixture',
      manifestSha256: expect.any(String) as unknown as string,
    });
    expect(body.lessons).toEqual([
      expect.objectContaining({
        order: 1,
        candidateLessonId: 'FIX-LS-01',
        contentVersion: '1.0.0-draft',
        documentId: 'FIX-DOC-01',
        displayTitle: 'Lesson 1: the authored title',
        labId: null,
      }),
      expect.objectContaining({
        order: 2,
        candidateLessonId: 'FIX-LS-02',
        documentId: 'FIX-DOC-02',
        displayTitle: 'Lesson 2: the authored title',
        labId: 'FIX-LAB-02',
      }),
    ]);
    await app.close();
  });

  it('does not ship lesson bodies to a page that only lists titles', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/release' });

    expect(response.body).not.toContain('Authored prose for lesson');
    await app.close();
  });
});

describe('GET /api/release after a refused release', () => {
  it('answers with the named failure and no lessons at all', async () => {
    db = openDatabase(':memory:');
    const dir = releaseDir((fixture) => fixture.files.delete('lessons/lesson-02.md'));
    const app = buildApp({ db, release: importRelease(db, dir) });

    const response = await app.inject({ method: 'GET', url: '/api/release' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      state: 'failed',
      failure: {
        code: 'file_missing',
        message: expect.stringContaining('lessons/lesson-02.md') as unknown as string,
        file: 'lessons/lesson-02.md',
      },
    });
    await app.close();
  });

  it('still answers /api/health, so a refused release does not look like a dead app', async () => {
    db = openDatabase(':memory:');
    const dir = releaseDir((fixture) => fixture.files.delete('lessons/lesson-02.md'));
    const app = buildApp({ db, release: importRelease(db, dir) });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});

describe('GET /api/lessons/:candidateLessonId', () => {
  it('serves the lesson body with the front matter and the title heading already removed', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      state: string;
      release: { releaseId: string; version: string };
      lesson: { displayTitle: string; bodyMarkdown: string };
    };
    expect(body.state).toBe('lesson');
    expect(body.release.releaseId).toBe('FIX-RELEASE');
    expect(body.lesson.displayTitle).toBe('Lesson 1: the authored title');
    expect(body.lesson.bodyMarkdown).toContain('Authored prose for lesson 1.');
    expect(body.lesson.bodyMarkdown).not.toContain('# Lesson 1: the authored title');
    expect(body.lesson.bodyMarkdown).not.toContain('candidate_lesson_id');
    await app.close();
  });

  it('carries the identity work will later be recorded against', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-02' });

    expect(response.json()).toMatchObject({
      state: 'lesson',
      lesson: {
        order: 2,
        candidateLessonId: 'FIX-LS-02',
        contentVersion: '1.0.0-draft',
        documentId: 'FIX-DOC-02',
        labId: 'FIX-LAB-02',
      },
    });
    await app.close();
  });

  it('selects the learner-facing front-matter facts rather than dumping the block', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' });
    const facts = (response.json() as { lesson: { facts: { key: string }[] } }).lesson.facts;

    expect(facts.map((fact) => fact.key)).toEqual(['prerequisites']);
    await app.close();
  });

  it('answers 404 naming the ID when the release has no such lesson', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-99' });

    // The code matters: a bare routing 404 would also carry the ID in its message, and would tell
    // the reader nothing about whether the release has that lesson.
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'lesson_not_found' });
    expect(JSON.stringify(response.json())).toContain('FIX-LS-99');
    await app.close();
  });

  it('states the named refusal when the release was refused, rather than a bare not-found', async () => {
    db = openDatabase(':memory:');
    const dir = releaseDir((fixture) => fixture.files.delete('lessons/lesson-02.md'));
    const app = buildApp({ db, release: importRelease(db, dir) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      state: 'failed',
      failure: {
        code: 'file_missing',
        message: expect.stringContaining('lessons/lesson-02.md') as unknown as string,
        file: 'lessons/lesson-02.md',
      },
    });
    await app.close();
  });

  it('reads without writing: no content row changes and none is added', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });
    const snapshot = (): string =>
      JSON.stringify(
        ['content_release', 'content_lesson', 'content_lab_kit', 'content_activity_set'].map(
          (table) => db?.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
        ),
      );
    const before = snapshot();

    const first = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' });
    const second = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-02' });

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(snapshot()).toBe(before);
    expect(before).toContain('candidate_lesson_id: FIX-LS-01');
    await app.close();
  });
});
