import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';
import type { ReleaseState } from './modules/content/types.js';
import {
  makeFixture,
  makeTempDir,
  removeDir,
  replaceActivitySet,
  writeFixture,
} from './modules/content/testkit/releaseFixture.js';

/**
 * Criteria A1–A11 and C7 in docs/specs/acknowledged-saves.md.
 *
 * Its own file rather than another describe in `app.test.ts`: that file is already 598 lines,
 * which is well past the ~350 the standards ask for, and this slice is not the one that gets to
 * split somebody else's suite.
 *
 * Two things these tests are careful about. A refusal must leave the store byte-identical — an
 * endpoint that answers 409 and writes anyway passes a status-code assertion and loses the
 * learner's work. And the provenance stored must be the server's, never the request body's, so
 * several of these send a deliberate lie and check it was ignored.
 */

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

interface FixtureActivity {
  activity_id: string;
  lesson_id: string;
  kind: string;
  title: string;
  source_heading: string;
  response_fields: string[];
  prompt_markdown: string;
}

function activityRecord(over: Partial<FixtureActivity> = {}): FixtureActivity {
  return {
    activity_id: 'ACT-FIX-01',
    lesson_id: 'FIX-LS-01',
    kind: 'interpretation',
    title: 'Practice A',
    source_heading: 'Practice A',
    response_fields: ['prediction', 'observation', 'explanation', 'help_used'],
    prompt_markdown: 'Explain the exchange.',
    ...over,
  };
}

/** The standard two-lesson fixture with the activities a test needs written into it. */
function releaseWith(activities: FixtureActivity[]): string {
  const dir = makeTempDir();
  tempDirs.push(dir);
  const fixture = makeFixture();
  replaceActivitySet(fixture, `${JSON.stringify({ activities }, null, 2)}\n`);
  return writeFixture(dir, fixture);
}

function appWith(activities: FixtureActivity[]) {
  db = openDatabase(':memory:');
  const release: ReleaseState = importRelease(db, releaseWith(activities));
  return buildApp({ db, release });
}

const oneActivity = [activityRecord()];

function put(
  app: ReturnType<typeof buildApp>,
  activityId: string,
  fieldName: string,
  payload: unknown,
) {
  return app.inject({
    method: 'PUT',
    url: `/api/activities/${encodeURIComponent(activityId)}/responses/${encodeURIComponent(fieldName)}`,
    payload: payload as Record<string, unknown>,
  });
}

async function lessonBody(app: ReturnType<typeof buildApp>, lessonId = 'FIX-LS-01') {
  const response = await app.inject({ method: 'GET', url: `/api/lessons/${lessonId}` });
  return response.json() as {
    responses?: {
      activityId: string;
      fieldName: string;
      text: string;
      revision: number;
      updatedAt: string;
    }[];
  };
}

describe('the lesson answer carries what is stored', () => {
  it('answers no responses for a lesson nothing has been written against', async () => {
    const app = appWith(oneActivity);

    expect((await lessonBody(app)).responses).toEqual([]);
  });

  it('carries a stored field with its text, revision and time, keyed by activity and field', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'It answers 200.', expectedRevision: 0 });

    const stored = (await lessonBody(app)).responses ?? [];

    expect(stored).toHaveLength(1);
    expect(stored[0]?.activityId).toBe('ACT-FIX-01');
    expect(stored[0]?.fieldName).toBe('prediction');
    expect(stored[0]?.text).toBe('It answers 200.');
    expect(stored[0]?.revision).toBe(1);
    expect(typeof stored[0]?.updatedAt).toBe('string');
  });

  it('leaves a field never written out of the array rather than answering it empty', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'only this one', expectedRevision: 0 });

    const stored = (await lessonBody(app)).responses ?? [];

    expect(stored.map((one) => one.fieldName)).toEqual(['prediction']);
  });

  it('never carries another lesson’s work into this lesson’s answer', async () => {
    const app = appWith([
      activityRecord({ activity_id: 'ACT-FIX-01', lesson_id: 'FIX-LS-01' }),
      activityRecord({
        activity_id: 'ACT-FIX-02',
        lesson_id: 'FIX-LS-02',
        source_heading: 'Practice B',
      }),
    ]);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'lesson one', expectedRevision: 0 });
    await put(app, 'ACT-FIX-02', 'prediction', { text: 'lesson two', expectedRevision: 0 });

    const first = (await lessonBody(app, 'FIX-LS-01')).responses ?? [];
    const second = (await lessonBody(app, 'FIX-LS-02')).responses ?? [];

    expect(first.map((one) => one.text)).toEqual(['lesson one']);
    expect(second.map((one) => one.text)).toEqual(['lesson two']);
  });

  it('carries work for an activity shown at the lesson’s foot, whose section the lesson lost', async () => {
    const app = appWith([
      activityRecord({ source_heading: 'A heading this lesson does not have' }),
    ]);
    await put(app, 'ACT-FIX-01', 'observation', { text: 'still recorded', expectedRevision: 0 });

    const stored = (await lessonBody(app)).responses ?? [];

    expect(stored.map((one) => one.text)).toEqual(['still recorded']);
  });
});

describe('writing one field', () => {
  it('acknowledges the save with the revision the next save must carry', async () => {
    const app = appWith(oneActivity);

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'It answers 200.',
      expectedRevision: 0,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ state: 'saved', revision: 1 });
    expect(typeof (response.json() as { updatedAt: unknown }).updatedAt).toBe('string');
  });

  it('accepts the next save against the revision it just handed back', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'first', expectedRevision: 0 });

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'second',
      expectedRevision: 1,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ state: 'saved', revision: 2 });
  });

  it('stores the lesson, content version and release the server knows — not what the body claims', async () => {
    const app = appWith(oneActivity);

    await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'work',
      expectedRevision: 0,
      candidateLessonId: 'LS-SOMEONE-ELSE',
      contentVersion: '99.0.0',
      releaseId: 'NOT-THIS-RELEASE',
    });

    const row = (db as Db)
      .prepare(
        'SELECT candidate_lesson_id, content_version, release_id FROM learner_response WHERE activity_id = ? AND field_name = ?',
      )
      .get('ACT-FIX-01', 'prediction') as {
      candidate_lesson_id: string;
      content_version: string;
      release_id: string;
    };

    expect(row.candidate_lesson_id).toBe('FIX-LS-01');
    expect(row.content_version).toBe('1.0.0-draft');
    expect(row.release_id).toBe('FIX-RELEASE');
  });

  it('stores an empty string when the reader clears a field they had saved', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'something', expectedRevision: 0 });

    const response = await put(app, 'ACT-FIX-01', 'prediction', { text: '', expectedRevision: 1 });

    expect(response.statusCode).toBe(200);
    expect((await lessonBody(app)).responses?.[0]?.text).toBe('');
  });
});

describe('a save the server will not make', () => {
  it('refuses a stale revision with 409 and the record that is actually stored', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'tab one', expectedRevision: 0 });
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'tab two', expectedRevision: 1 });

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'stale tab',
      expectedRevision: 1,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: 'revision_conflict',
      stored: { text: 'tab two', revision: 2 },
    });
    // A4 lists updatedAt among what the 409 must carry: the page shows the reader when the text it
    // is being asked to reckon with was written, and a second request to find that out is the
    // round trip this criterion exists to avoid.
    const { stored: current } = response.json() as { stored: { updatedAt: unknown } };
    expect(typeof current.updatedAt).toBe('string');
    expect(current.updatedAt).not.toBe('');
  });

  it('changes nothing when it refuses a stale revision', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'tab one', expectedRevision: 0 });

    await put(app, 'ACT-FIX-01', 'prediction', { text: 'stale tab', expectedRevision: 0 });

    const stored = (await lessonBody(app)).responses ?? [];
    expect(stored[0]?.text).toBe('tab one');
    expect(stored[0]?.revision).toBe(1);
  });

  it('refuses an activity this release does not carry', async () => {
    const app = appWith(oneActivity);

    const response = await put(app, 'ACT-NOT-HERE', 'prediction', {
      text: 'work',
      expectedRevision: 0,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'activity_not_found' });
    expect((response.json() as { message: string }).message).toContain('ACT-NOT-HERE');
  });

  it('refuses a field the activity never declared, naming the fields it did', async () => {
    const app = appWith([activityRecord({ response_fields: ['prediction', 'observation'] })]);

    const response = await put(app, 'ACT-FIX-01', 'reflection', {
      text: 'work',
      expectedRevision: 0,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'field_not_declared' });
    const { message } = response.json() as { message: string };
    expect(message).toContain('prediction');
    expect(message).toContain('observation');
  });

  it('stores nothing for a field it refused as undeclared', async () => {
    const app = appWith([activityRecord({ response_fields: ['prediction'] })]);

    await put(app, 'ACT-FIX-01', 'help_used', { text: 'yes', expectedRevision: 0 });

    expect((await lessonBody(app)).responses).toEqual([]);
  });

  it.each([
    ['text that is not a string', { text: 42, expectedRevision: 0 }, 'text'],
    ['text that is missing', { expectedRevision: 0 }, 'text'],
    ['a null body', null, 'text'],
    [
      'an expected revision that is not a number',
      { text: 'x', expectedRevision: 'one' },
      'revision',
    ],
    ['a negative expected revision', { text: 'x', expectedRevision: -1 }, 'revision'],
    ['a fractional expected revision', { text: 'x', expectedRevision: 1.5 }, 'revision'],
    ['an expected revision that is missing', { text: 'x' }, 'revision'],
  ])(
    'refuses %s with 400, naming the part at fault, and no coercion',
    async (_name, payload, part) => {
      const app = appWith(oneActivity);

      const response = await put(app, 'ACT-FIX-01', 'prediction', payload);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: 'response_invalid' });
      // One generic sentence for all seven shapes tells the reader nothing about what to change,
      // and A7 asks each refusal to name which part was wrong. Its siblings A6 and A8 already do.
      expect((response.json() as { message: string }).message.toLowerCase()).toContain(part);
      expect((await lessonBody(app)).responses).toEqual([]);
    },
  );

  it('refuses text past the limit, naming the limit and the length it got', async () => {
    const app = appWith(oneActivity);

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'x'.repeat(100_001),
      expectedRevision: 0,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'response_too_long' });
    const { message } = response.json() as { message: string };
    expect(message).toContain('100,000');
    expect(message).toContain('100,001');
    expect((await lessonBody(app)).responses).toEqual([]);
  });

  it('still names the refusal for a paste far past the limit, rather than a transport error', async () => {
    // Fastify's default body limit is 1 MiB, which sits between the 100,000-character limit this
    // app names and the size of an actual paste accident. Left at the default, the biggest pastes
    // — the case the limit was written for — were refused by the framework with a generic 413
    // before the handler that knows how to explain it ever ran.
    const app = appWith(oneActivity);

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'x'.repeat(2_000_000),
      expectedRevision: 0,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'response_too_long' });
    expect((await lessonBody(app)).responses).toEqual([]);
  });

  it('accepts text exactly at the limit, so the boundary is not off by one', async () => {
    const app = appWith(oneActivity);

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'x'.repeat(100_000),
      expectedRevision: 0,
    });

    expect(response.statusCode).toBe(200);
  });

  it('writes nothing while the release stands refused, and says so in the server’s own words', async () => {
    db = openDatabase(':memory:');
    const dir = makeTempDir();
    tempDirs.push(dir);
    const fixture = makeFixture();
    fixture.manifest.lessons[0]!.sha256 = 'a'.repeat(64);
    const release: ReleaseState = importRelease(db, writeFixture(dir, fixture));
    const app = buildApp({ db, release });

    const response = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'work',
      expectedRevision: 0,
    });

    // The same shape the other endpoints answer a refused release with — code, message and the
    // file at fault — not a bare `failed` the page cannot say anything about.
    expect(response.json()).toMatchObject({
      state: 'failed',
      failure: { code: 'hash_mismatch', file: 'lessons/lesson-01.md' },
    });
    const { failure } = response.json() as { failure: { message: string } };
    expect(failure.message).toContain('lessons/lesson-01.md');
    const rows = db.prepare('SELECT COUNT(*) AS n FROM learner_response').get() as { n: number };
    expect(rows.n).toBe(0);
  });
});

describe('two clients on the same field (C7)', () => {
  it('lets one through, refuses the other with what is stored, and keeps exactly one text', async () => {
    const app = appWith(oneActivity);

    // Both read the empty field and believe they are writing the first revision.
    const first = await put(app, 'ACT-FIX-01', 'explanation', {
      text: 'because the header said so',
      expectedRevision: 0,
    });
    const second = await put(app, 'ACT-FIX-01', 'explanation', {
      text: 'because the cache was hot',
      expectedRevision: 0,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      error: 'revision_conflict',
      stored: { text: 'because the header said so', revision: 1 },
    });

    // Keep mine: the refused client re-sends against the revision it was just told about.
    const kept = await put(app, 'ACT-FIX-01', 'explanation', {
      text: 'because the cache was hot',
      expectedRevision: 1,
    });

    expect(kept.statusCode).toBe(200);
    const stored = (await lessonBody(app)).responses ?? [];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.text).toBe('because the cache was hot');
    expect(stored[0]?.revision).toBe(2);
  });

  it('refuses the same field twice over rather than giving up and overwriting', async () => {
    const app = appWith(oneActivity);
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'one', expectedRevision: 0 });
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'two', expectedRevision: 1 });

    const stale = await put(app, 'ACT-FIX-01', 'prediction', { text: 'mine', expectedRevision: 0 });
    expect(stale.statusCode).toBe(409);

    // A third tab moves it on again before the refused client presses Keep mine.
    await put(app, 'ACT-FIX-01', 'prediction', { text: 'three', expectedRevision: 2 });
    const keepMine = await put(app, 'ACT-FIX-01', 'prediction', {
      text: 'mine',
      expectedRevision: 2,
    });

    expect(keepMine.statusCode).toBe(409);
    expect((await lessonBody(app)).responses?.[0]?.text).toBe('three');
  });
});
