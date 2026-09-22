import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { migrate, openDatabase, readSchemaVersion, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';
import type { ReleaseState } from './modules/content/types.js';
import {
  lessonSource,
  makeFixture,
  makeTempDir,
  removeDir,
  sha256,
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

/** The standard fixture plus a third lesson, so a lesson can exist with a neighbour on each side. */
function threeLessonDir(): string {
  return releaseDir((fixture) => {
    const source = lessonSource(
      [
        'document_id: FIX-DOC-03',
        'version: "1.0.0-draft"',
        'module: M020',
        'candidate_lesson_id: FIX-LS-03',
      ].join('\n'),
      '# Lesson 3: the authored title\n\nAuthored prose for lesson 3.',
    );
    fixture.files.set('lessons/lesson-03.md', Buffer.from(source, 'utf8'));
    fixture.manifest.lessons.push({
      order: 3,
      lesson_id: 'FIX-LS-03',
      document_id: 'FIX-DOC-03',
      version: '1.0.0-draft',
      module: 'M020',
      title: 'Lesson 3 as the manifest names it',
      path: 'lessons/lesson-03.md',
      sha256: sha256(source),
      lab_id: null,
    });
  });
}

describe('the walking skeleton', () => {
  it('answers /api/health with the schema version actually stored in the database', async () => {
    db = openDatabase(':memory:');
    const release: ReleaseState = importRelease(db, releaseDir());
    const app = buildApp({ db, release });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    // '3' since slice 4 added the resume_point table; declared in
    // docs/specs/reader-navigation-and-resume.md.
    expect(response.json()).toEqual({ status: 'ok', schemaVersion: '3' });
    await app.close();
  });

  it('applies each migration once, so restarting the app does not re-seed the database', () => {
    db = openDatabase(':memory:');
    migrate(db);
    migrate(db);

    const rows = db.prepare('SELECT count(*) AS n FROM schema_meta').get() as { n: number };
    expect(rows.n).toBe(1);
    expect(readSchemaVersion(db)).toBe('3');
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

  it('names its neighbours in stored order: the first lesson has no previous', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' });

    const body = response.json() as { previous: unknown; next: unknown };
    expect(body.previous).toBeNull();
    expect(body.next).toEqual({
      order: 2,
      candidateLessonId: 'FIX-LS-02',
      displayTitle: 'Lesson 2: the authored title',
    });
    await app.close();
  });

  it('names its neighbours in stored order: the last lesson has no next', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-02' });

    const body = response.json() as { previous: unknown; next: unknown };
    expect(body.next).toBeNull();
    expect(body.previous).toEqual({
      order: 1,
      candidateLessonId: 'FIX-LS-01',
      displayTitle: 'Lesson 1: the authored title',
    });
    await app.close();
  });

  it('gives a middle lesson both neighbours', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, threeLessonDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-02' });

    const body = response.json() as {
      previous: { candidateLessonId: string };
      next: { candidateLessonId: string };
    };
    expect(body.previous.candidateLessonId).toBe('FIX-LS-01');
    expect(body.next.candidateLessonId).toBe('FIX-LS-03');
    await app.close();
  });

  it('follows the manifest order field, not the array position', async () => {
    db = openDatabase(':memory:');
    // The same two lessons, arriving with the array reversed: order fields still say 1 then 2.
    const dir = releaseDir((fixture) => fixture.manifest.lessons.reverse());
    const app = buildApp({ db, release: importRelease(db, dir) });

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' });

    const body = response.json() as { previous: unknown; next: { candidateLessonId: string } };
    expect(body.previous).toBeNull();
    expect(body.next.candidateLessonId).toBe('FIX-LS-02');
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

/**
 * Criteria R and A in docs/specs/reader-navigation-and-resume.md: the resume point is one silent
 * server-side pointer (ADR 0010) — stored on PUT, answered on GET, never claiming more than "the
 * lesson last opened", and never deleting or rewriting what an earlier release recorded.
 */
describe('the resume point', () => {
  async function putResume(app: FastifyInstance, payload: unknown) {
    return app.inject({
      method: 'PUT',
      url: '/api/resume-point',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(payload),
    });
  }

  it('answers none before any lesson was ever opened', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const response = await app.inject({ method: 'GET', url: '/api/resume-point' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ state: 'none' });
    await app.close();
  });

  it('stores the lesson it is given and answers it back with when', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const put = await putResume(app, { candidateLessonId: 'FIX-LS-02' });
    expect(put.statusCode).toBe(200);

    const got = await app.inject({ method: 'GET', url: '/api/resume-point' });
    expect(got.json()).toEqual({
      state: 'set',
      candidateLessonId: 'FIX-LS-02',
      recordedAt: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      ) as unknown as string,
    });
    await app.close();
  });

  it('survives a restart: a new app over the same database still answers it', async () => {
    db = openDatabase(':memory:');
    const dir = releaseDir();
    const first = buildApp({ db, release: importRelease(db, dir) });
    await putResume(first, { candidateLessonId: 'FIX-LS-01' });
    await first.close();

    // The same start path the real process takes: re-import (a verified no-op) and rebuild.
    const second = buildApp({ db, release: importRelease(db, dir) });
    const got = await second.inject({ method: 'GET', url: '/api/resume-point' });

    expect(got.json()).toMatchObject({ state: 'set', candidateLessonId: 'FIX-LS-01' });
    await second.close();
  });

  it('keeps one pointer only: the lesson opened last wins', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    await putResume(app, { candidateLessonId: 'FIX-LS-01' });
    await putResume(app, { candidateLessonId: 'FIX-LS-02' });

    const got = await app.inject({ method: 'GET', url: '/api/resume-point' });
    expect(got.json()).toMatchObject({ state: 'set', candidateLessonId: 'FIX-LS-02' });
    const rows = db.prepare('SELECT count(*) AS n FROM resume_point').get() as { n: number };
    expect(rows.n).toBe(1);
    await app.close();
  });

  it('refuses a lesson the release does not carry, names it, and stores nothing', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    const put = await putResume(app, { candidateLessonId: 'FIX-LS-99' });

    expect(put.statusCode).toBe(404);
    expect(put.json()).toMatchObject({ error: 'lesson_not_found' });
    expect(JSON.stringify(put.json())).toContain('FIX-LS-99');

    const got = await app.inject({ method: 'GET', url: '/api/resume-point' });
    expect(got.json()).toEqual({ state: 'none' });
    await app.close();
  });

  it('refuses a body that does not name a lesson, and stores nothing', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });

    for (const payload of [{}, { candidateLessonId: 7 }, { candidateLessonId: '' }]) {
      const put = await putResume(app, payload);
      expect(put.statusCode).toBe(400);
      expect(put.json()).toMatchObject({ error: 'resume_point_invalid' });
    }

    const got = await app.inject({ method: 'GET', url: '/api/resume-point' });
    expect(got.json()).toEqual({ state: 'none' });
    await app.close();
  });

  it('answers the named refusal while the release stands refused, and stores nothing', async () => {
    db = openDatabase(':memory:');
    const dir = releaseDir((fixture) => fixture.files.delete('lessons/lesson-02.md'));
    const app = buildApp({ db, release: importRelease(db, dir) });

    const got = await app.inject({ method: 'GET', url: '/api/resume-point' });
    expect(got.json()).toMatchObject({ state: 'failed', failure: { code: 'file_missing' } });

    const put = await putResume(app, { candidateLessonId: 'FIX-LS-01' });
    expect(put.json()).toMatchObject({ state: 'failed', failure: { code: 'file_missing' } });
    const rows = db.prepare('SELECT count(*) AS n FROM resume_point').get() as { n: number };
    expect(rows.n).toBe(0);
    await app.close();
  });

  it('answers none — without deleting the record — when the stored lesson left the release', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db, release: importRelease(db, releaseDir()) });
    // A pointer recorded under an earlier release whose lesson this release does not carry. Written
    // directly: the endpoint itself refuses to store an unknown lesson, which is its own test above.
    db.prepare(
      "INSERT INTO resume_point (id, candidate_lesson_id, recorded_at) VALUES (1, 'OLD-LS-77', '2026-09-01T08:00:00.000Z')",
    ).run();

    const got = await app.inject({ method: 'GET', url: '/api/resume-point' });

    expect(got.json()).toEqual({ state: 'none' });
    const row = db.prepare('SELECT candidate_lesson_id FROM resume_point WHERE id = 1').get() as {
      candidate_lesson_id: string;
    };
    expect(row.candidate_lesson_id).toBe('OLD-LS-77');
    await app.close();
  });
});
