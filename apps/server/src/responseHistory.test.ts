import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';
import type { ReleaseState } from './modules/content/types.js';
import {
  lessonSource,
  makeFixture,
  makeTempDir,
  removeDir,
  replaceActivitySet,
  replaceLessonFile,
  writeFixture,
} from './modules/content/testkit/releaseFixture.js';

/**
 * Criteria A10–A14 and S8 in docs/specs/prediction-history.md (ADR 0012).
 *
 * What the server says about a field's earlier versions, and what a correction does to them. The
 * sharp test is the last one: a corrected release is the case `docs/brief.md` names as a hard
 * constraint — "Importing a new content version must not overwrite an earlier recorded prediction
 * or change the question it answered" — and it is the one that cannot be checked by looking at the
 * live record, because the live record's stamp is *supposed* to move.
 *
 * Its own file rather than another describe in `responses.test.ts`, which is already at 449 lines.
 */

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

const activities = [
  {
    activity_id: 'ACT-FIX-01',
    lesson_id: 'FIX-LS-01',
    kind: 'interpretation',
    title: 'Practice A',
    source_heading: 'Practice A',
    response_fields: ['prediction', 'observation'],
    prompt_markdown: 'Explain the exchange.',
  },
];

function releaseDir(corrected = false): string {
  const dir = makeTempDir();
  tempDirs.push(dir);
  const fixture = makeFixture();
  replaceActivitySet(fixture, `${JSON.stringify({ activities }, null, 2)}\n`);
  if (corrected) {
    replaceLessonFile(
      fixture,
      'lessons/lesson-01.md',
      lessonSource(
        [
          'document_id: FIX-DOC-01',
          'version: "1.0.1-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-01',
          'prerequisites:',
          '  - "Has opened a web page"',
        ].join('\n'),
        '# Lesson 1: the authored title\n\nAuthored prose, corrected.',
      ),
    );
    const lesson = fixture.manifest.lessons.find((one) => one.lesson_id === 'FIX-LS-01');
    if (lesson) lesson.version = '1.0.1-draft';
    fixture.manifest.version = '1.0.1-draft';
  }
  return writeFixture(dir, fixture);
}

function appOn(dir: string) {
  const release: ReleaseState = importRelease(db as Db, dir);
  return buildApp({ db: db as Db, release, releaseDir: dir });
}

function freshApp(corrected = false) {
  db ??= openDatabase(':memory:');
  return appOn(releaseDir(corrected));
}

interface EarlierVersion {
  revision: number;
  text: string;
  writtenAt: string;
  contentVersion: string;
  releaseId?: unknown;
  candidateLessonId?: unknown;
}

interface PageResponse {
  activityId: string;
  fieldName: string;
  text: string;
  revision: number;
  updatedAt: string;
  earlierVersions?: EarlierVersion[];
}

function put(app: ReturnType<typeof buildApp>, fieldName: string, payload: unknown) {
  return app.inject({
    method: 'PUT',
    url: `/api/activities/ACT-FIX-01/responses/${fieldName}`,
    payload: payload as Record<string, unknown>,
  });
}

/** Saves a sequence of texts through the endpoint, each against the revision the last returned. */
async function saveAll(
  app: ReturnType<typeof buildApp>,
  texts: readonly string[],
  fieldName = 'prediction',
): Promise<number> {
  let revision = 0;
  for (const text of texts) {
    const answer = await put(app, fieldName, { text, expectedRevision: revision });
    const body = answer.json() as { state?: string; revision?: number };
    if (body.state !== 'saved') throw new Error(`"${text}" was not saved: ${answer.body}`);
    revision = body.revision as number;
  }
  return revision;
}

async function responsesOf(
  app: ReturnType<typeof buildApp>,
  lessonId = 'FIX-LS-01',
): Promise<PageResponse[]> {
  const answer = await app.inject({ method: 'GET', url: `/api/lessons/${lessonId}` });
  return (answer.json() as { responses?: PageResponse[] }).responses ?? [];
}

const fieldOf = (responses: PageResponse[], fieldName: string): PageResponse | undefined =>
  responses.find((one) => one.fieldName === fieldName);

describe('the lesson answer carries a field’s earlier versions', () => {
  it('carries every revision but the one in the box, newest first', async () => {
    const app = freshApp();
    await saveAll(app, ['first guess', 'second guess', 'what I settled on']);

    const field = fieldOf(await responsesOf(app), 'prediction');

    expect(field?.text).toBe('what I settled on');
    expect(field?.earlierVersions?.map((one) => [one.revision, one.text])).toEqual([
      [2, 'second guess'],
      [1, 'first guess'],
    ]);
  });

  it('carries the time each earlier version was written and the version it answered', async () => {
    const app = freshApp();
    await saveAll(app, ['first guess', 'what I settled on']);

    const earlier = fieldOf(await responsesOf(app), 'prediction')?.earlierVersions ?? [];

    expect(earlier).toHaveLength(1);
    expect(earlier[0]?.contentVersion).toBe('1.0.0-draft');
    expect(Number.isNaN(Date.parse(earlier[0]?.writtenAt ?? ''))).toBe(false);
  });

  it('carries an empty list, not an absent one, for a field written exactly once', async () => {
    const app = freshApp();
    await saveAll(app, ['the only answer']);

    expect(fieldOf(await responsesOf(app), 'prediction')?.earlierVersions).toEqual([]);
  });

  it('keeps each field’s earlier versions to that field', async () => {
    const app = freshApp();
    await saveAll(app, ['p1', 'p2', 'p3'], 'prediction');
    await saveAll(app, ['o1'], 'observation');

    const responses = await responsesOf(app);

    expect(fieldOf(responses, 'prediction')?.earlierVersions?.map((one) => one.text)).toEqual([
      'p2',
      'p1',
    ]);
    expect(fieldOf(responses, 'observation')?.earlierVersions).toEqual([]);
  });

  it('answers no response at all for a field nothing has been saved against', async () => {
    const app = freshApp();
    await saveAll(app, ['p1', 'p2'], 'prediction');

    expect(fieldOf(await responsesOf(app), 'observation')).toBeUndefined();
  });

  it('never puts the release or the lesson key in an earlier version', async () => {
    const app = freshApp();
    await saveAll(app, ['first', 'second']);

    const earlier = fieldOf(await responsesOf(app), 'prediction')?.earlierVersions ?? [];

    expect(Object.keys(earlier[0] ?? {}).sort()).toEqual([
      'contentVersion',
      'revision',
      'text',
      'writtenAt',
    ]);
  });
});

describe('what a save answers about the history it just made', () => {
  it('carries the earlier versions recomputed after the write, so the page invents none', async () => {
    const app = freshApp();
    const revision = await saveAll(app, ['first guess']);

    const answer = await put(app, 'prediction', { text: 'corrected', expectedRevision: revision });
    const body = answer.json() as { state: string; earlierVersions?: EarlierVersion[] };

    expect(body.state).toBe('saved');
    expect(body.earlierVersions?.map((one) => [one.revision, one.text])).toEqual([
      [1, 'first guess'],
    ]);
  });

  it('carries an empty list on the first accepted save of a field', async () => {
    const app = freshApp();

    const answer = await put(app, 'prediction', { text: 'the first', expectedRevision: 0 });

    expect((answer.json() as { earlierVersions?: EarlierVersion[] }).earlierVersions).toEqual([]);
  });

  it('carries the unchanged list when a save repeats the stored text word for word', async () => {
    const app = freshApp();
    const revision = await saveAll(app, ['first guess', 'corrected']);

    const answer = await put(app, 'prediction', { text: 'corrected', expectedRevision: revision });
    const body = answer.json() as { state: string; earlierVersions?: EarlierVersion[] };

    expect(body.state).toBe('saved');
    expect(body.earlierVersions?.map((one) => one.text)).toEqual(['first guess']);
  });

  it('carries the earlier versions on a refusal too, and writes nothing', async () => {
    const app = freshApp();
    await saveAll(app, ['first guess', 'corrected']);

    const answer = await put(app, 'prediction', { text: 'from a stale tab', expectedRevision: 1 });
    const body = answer.json() as {
      error: string;
      stored?: { text: string };
      earlierVersions?: EarlierVersion[];
    };

    expect(answer.statusCode).toBe(409);
    expect(body.error).toBe('revision_conflict');
    expect(body.stored?.text).toBe('corrected');
    expect(body.earlierVersions?.map((one) => one.text)).toEqual(['first guess']);
    // And the refusal really did write nothing: the page's own list is still the same afterwards.
    expect(fieldOf(await responsesOf(app), 'prediction')?.earlierVersions).toHaveLength(1);
  });

  it('records nothing from a request that names a version of its own', async () => {
    const app = freshApp();

    await put(app, 'prediction', {
      text: 'answered',
      expectedRevision: 0,
      contentVersion: '9.9.9-lie',
      releaseId: 'NOT-THIS-RELEASE',
    });
    const revision = 1;
    await put(app, 'prediction', { text: 'corrected', expectedRevision: revision });

    const earlier = fieldOf(await responsesOf(app), 'prediction')?.earlierVersions ?? [];
    expect(earlier[0]?.contentVersion).toBe('1.0.0-draft');
  });
});

describe('a corrected release and the answers written before it', () => {
  it('leaves every earlier version with the text and version it was written under', async () => {
    const first = freshApp();
    await saveAll(first, ['I think it 404s.', 'It answered 200.']);
    await first.close();

    // The same record store, a corrected release imported over it — the case the brief makes a
    // hard constraint. The live record's stamp is allowed to move on the next write; the history
    // is not allowed to move at all.
    const corrected = appOn(releaseDir(true));
    const beforeAnyNewWrite = fieldOf(await responsesOf(corrected), 'prediction');

    expect(beforeAnyNewWrite?.text).toBe('It answered 200.');
    expect(beforeAnyNewWrite?.earlierVersions).toEqual([
      expect.objectContaining({
        revision: 1,
        text: 'I think it 404s.',
        contentVersion: '1.0.0-draft',
      }),
    ]);
  });

  it('stamps the corrected version on the new answer while the old ones keep theirs', async () => {
    const first = freshApp();
    const revision = await saveAll(first, ['I think it 404s.', 'It answered 200.']);
    await first.close();

    const corrected = appOn(releaseDir(true));
    await put(corrected, 'prediction', {
      text: 'Answered again against the corrected wording.',
      expectedRevision: revision,
    });

    const earlier = fieldOf(await responsesOf(corrected), 'prediction')?.earlierVersions ?? [];
    expect(earlier.map((one) => [one.text, one.contentVersion])).toEqual([
      ['It answered 200.', '1.0.0-draft'],
      ['I think it 404s.', '1.0.0-draft'],
    ]);
  });
});
