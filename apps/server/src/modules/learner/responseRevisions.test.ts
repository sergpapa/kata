import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrate, openDatabase, readSchemaVersion, type Db } from '../lifecycle/database.js';
import { migrations } from '../lifecycle/migrations.js';
import {
  loadEarlierRevisions,
  loadResponse,
  saveResponse,
  type ResponseWrite,
} from './responseRepository.js';

/**
 * Criteria S1–S9 in docs/specs/prediction-history.md (ADR 0012).
 *
 * The claim under test is not "rows appear". It is that **nothing the owner committed to can be
 * taken away by a later write** — so most of these assert what an earlier revision still holds
 * after something else happened to it, which is the only shape that can tell an append-only store
 * apart from one that quietly updates in place and reports the same row count.
 *
 * Kept out of responseRepository.test.ts, which is already at 449 lines.
 */

const files: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (files.length > 0) fs.rmSync(files.pop() as string, { force: true, recursive: true });
});

function write(over: Partial<ResponseWrite> = {}): ResponseWrite {
  return {
    activityId: 'ACT-FIX-01',
    fieldName: 'prediction',
    candidateLessonId: 'FIX-LS-01',
    contentVersion: '1.0.0-draft',
    releaseId: 'FIX-RELEASE',
    text: 'The server will answer 200.',
    expectedRevision: 0,
    updatedAt: '2026-09-23T10:00:00.000Z',
    ...over,
  };
}

/** Writes a sequence of texts, each against the revision the previous write produced. */
function writeAll(database: Db, texts: readonly string[], over: Partial<ResponseWrite> = {}): void {
  let revision = 0;
  for (const [index, text] of texts.entries()) {
    const outcome = saveResponse(
      database,
      write({
        ...over,
        text,
        expectedRevision: revision,
        updatedAt: `2026-09-23T1${index}:00:00.000Z`,
      }),
    );
    if (outcome.state !== 'saved') throw new Error(`write ${index + 1} was refused`);
    revision = outcome.response.revision;
  }
}

/** Every revision of one field, newest first — the store's own record, read directly. */
function allRevisions(database: Db, activityId = 'ACT-FIX-01', fieldName = 'prediction') {
  return database
    .prepare(
      `SELECT revision, text, content_version, release_id, candidate_lesson_id, written_at
         FROM learner_response_revision
        WHERE activity_id = ? AND field_name = ?
        ORDER BY revision DESC`,
    )
    .all(activityId, fieldName) as {
    revision: number;
    text: string;
    content_version: string;
    release_id: string;
    candidate_lesson_id: string;
    written_at: string;
  }[];
}

describe('the revision table', () => {
  it('brings the schema to 7, through migration 5', () => {
    db = openDatabase(':memory:');

    expect(readSchemaVersion(db)).toBe('7');
  });

  it('leaves the live record table exactly as schema 4 left it', () => {
    db = openDatabase(':memory:');

    // The whole point of ADR 0012 is that this slice is additive. A migration that altered
    // learner_response would take the compare-and-set contract with it, and every save-state
    // claim in the previous slice stands on that.
    const columns = (
      db.prepare('PRAGMA table_info(learner_response)').all() as { name: string }[]
    ).map((column) => column.name);
    expect(columns).toEqual([
      'id',
      'activity_id',
      'field_name',
      'candidate_lesson_id',
      'content_version',
      'release_id',
      'text',
      'revision',
      'updated_at',
    ]);
  });
});

describe('a store that was already carrying work before this table existed', () => {
  /** A record store at schema 4 exactly as slice 10 left it, with one answer already in it. */
  function atSchemaFour(): Db {
    const database = new Database(':memory:') as Db;
    database.pragma('foreign_keys = ON');
    database.exec(
      'CREATE TABLE IF NOT EXISTS applied_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)',
    );
    for (const migration of migrations.filter((one) => one.id <= 4)) {
      database.exec(migration.sql);
      database
        .prepare('INSERT INTO applied_migrations (id, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.id, migration.name, '2026-09-22T10:00:00.000Z');
    }
    database
      .prepare(
        `INSERT INTO learner_response
           (activity_id, field_name, candidate_lesson_id, content_version, release_id,
            text, revision, updated_at)
         VALUES ('ACT-FIX-01', 'prediction', 'FIX-LS-01', '1.0.0-draft', 'FIX-RELEASE',
                 'written before this table existed', 3, '2026-09-22T11:00:00.000Z')`,
      )
      .run();
    return database;
  }

  it('makes each answer already stored its own first revision', () => {
    // The owner has been recording work since slice 10. A migration that only starts recording
    // from here would let their existing answer vanish the first time they corrected it — which is
    // the exact loss this slice exists to prevent, on the one store that actually matters.
    db = atSchemaFour();

    migrate(db);

    expect(readSchemaVersion(db)).toBe('7');
    expect(allRevisions(db)).toEqual([
      {
        revision: 3,
        text: 'written before this table existed',
        content_version: '1.0.0-draft',
        release_id: 'FIX-RELEASE',
        candidate_lesson_id: 'FIX-LS-01',
        written_at: '2026-09-22T11:00:00.000Z',
      },
    ]);
  });

  it('keeps that answer readable as an earlier version once it is corrected', () => {
    db = atSchemaFour();
    migrate(db);

    saveResponse(
      db,
      write({
        text: 'corrected after the upgrade',
        expectedRevision: 3,
        contentVersion: '1.0.1-draft',
      }),
    );

    expect(
      loadEarlierRevisions(db, ['ACT-FIX-01']).map((one) => [one.text, one.contentVersion]),
    ).toEqual([['written before this table existed', '1.0.0-draft']]);
  });

  it('holds the live-text invariant from the moment the migration finishes', () => {
    db = atSchemaFour();

    migrate(db);

    expect(allRevisions(db)[0]?.text).toBe(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text);
  });

  it('brings a store with no work at all to 7 without inventing a revision', () => {
    db = openDatabase(':memory:');

    expect(readSchemaVersion(db)).toBe('7');
    expect(db.prepare('SELECT count(*) AS n FROM learner_response_revision').get()).toEqual({
      n: 0,
    });
  });
});

describe('what an accepted write records', () => {
  it('appends one revision carrying the text, the number the live record took, and the server’s stamp', () => {
    db = openDatabase(':memory:');

    saveResponse(db, write({ text: 'I think it 404s.' }));

    const revisions = allRevisions(db);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.text).toBe('I think it 404s.');
    expect(revisions[0]?.revision).toBe(loadResponse(db, 'ACT-FIX-01', 'prediction')?.revision);
    expect(revisions[0]?.content_version).toBe('1.0.0-draft');
    expect(revisions[0]?.release_id).toBe('FIX-RELEASE');
    expect(revisions[0]?.candidate_lesson_id).toBe('FIX-LS-01');
    expect(revisions[0]?.written_at).toBe('2026-09-23T10:00:00.000Z');
  });

  it('keeps the earlier text word for word when a later write replaces it', () => {
    db = openDatabase(':memory:');

    writeAll(db, ['I think it 404s.', 'It answered 200 — I was wrong about the path.']);

    expect(allRevisions(db).map((one) => one.text)).toEqual([
      'It answered 200 — I was wrong about the path.',
      'I think it 404s.',
    ]);
  });

  it('stamps each revision with the version that write was made under, not the latest', () => {
    db = openDatabase(':memory:');

    saveResponse(db, write({ text: 'answered the old wording', contentVersion: '1.0.0-draft' }));
    saveResponse(
      db,
      write({
        text: 'answered the corrected wording',
        contentVersion: '1.0.1-draft',
        expectedRevision: 1,
      }),
    );

    expect(allRevisions(db).map((one) => [one.revision, one.content_version])).toEqual([
      [2, '1.0.1-draft'],
      [1, '1.0.0-draft'],
    ]);
  });

  it('preserves the text character for character, including whitespace and newlines', () => {
    db = openDatabase(':memory:');
    const exact = '  line one\n\n\tline two with a trailing space \n';

    writeAll(db, [exact, 'something else']);

    expect(allRevisions(db).map((one) => one.text)).toContain(exact);
  });

  it('records nothing when the text is character for character what the newest revision holds', () => {
    db = openDatabase(':memory:');

    writeAll(db, ['same text', 'same text']);

    expect(allRevisions(db)).toHaveLength(1);
  });

  it('still accepts that repeat and still moves the live record', () => {
    db = openDatabase(':memory:');

    writeAll(db, ['same text']);
    const outcome = saveResponse(
      db,
      write({ text: 'same text', expectedRevision: 1, updatedAt: '2026-09-23T11:30:00.000Z' }),
    );

    expect(outcome.state).toBe('saved');
    const live = loadResponse(db, 'ACT-FIX-01', 'prediction');
    expect(live?.revision).toBe(2);
    expect(live?.updatedAt).toBe('2026-09-23T11:30:00.000Z');
  });

  it('records a text the owner returns to as its own revision rather than reusing the old one', () => {
    db = openDatabase(':memory:');

    writeAll(db, ['A', 'B', 'A']);

    expect(allRevisions(db).map((one) => [one.revision, one.text])).toEqual([
      [3, 'A'],
      [2, 'B'],
      [1, 'A'],
    ]);
  });

  it('records nothing when the write is refused as a revision conflict', () => {
    db = openDatabase(':memory:');
    writeAll(db, ['what is stored']);

    const outcome = saveResponse(db, write({ text: 'from a stale tab', expectedRevision: 7 }));

    expect(outcome.state).toBe('conflict');
    expect(allRevisions(db).map((one) => one.text)).toEqual(['what is stored']);
  });

  it('records nothing when a first write loses the race to another first write', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ text: 'the one that got there' }));

    const outcome = saveResponse(db, write({ text: 'the one that did not', expectedRevision: 0 }));

    expect(outcome.state).toBe('conflict');
    expect(allRevisions(db).map((one) => one.text)).toEqual(['the one that got there']);
  });

  it('leaves the live record untouched when the append itself fails', () => {
    db = openDatabase(':memory:');
    writeAll(db, ['first answer']);
    // A row planted at the number the next accepted write will take. The table's own uniqueness
    // refuses the append, and the only honest outcome is that the live record did not move either:
    // a save that reported success while its history was lost is the failure this slice exists to
    // prevent.
    db.prepare(
      `INSERT INTO learner_response_revision
         (activity_id, field_name, revision, candidate_lesson_id, content_version, release_id,
          text, written_at)
       VALUES ('ACT-FIX-01', 'prediction', 2, 'FIX-LS-01', '1.0.0-draft', 'FIX-RELEASE',
               'planted', '2026-09-23T10:30:00.000Z')`,
    ).run();

    expect(() =>
      saveResponse(db as Db, write({ text: 'second answer', expectedRevision: 1 })),
    ).toThrow();

    const live = loadResponse(db, 'ACT-FIX-01', 'prediction');
    expect(live?.text).toBe('first answer');
    expect(live?.revision).toBe(1);
  });
});

describe('the invariant the page depends on', () => {
  it('keeps the live text equal to the newest revision’s text through any sequence of writes', () => {
    db = openDatabase(':memory:');

    // Repeats, a return to an earlier text, and an empty answer, in one sequence: each is a case
    // where a naive "append whatever arrived" or "append only when it is new to the field" rule
    // breaks the invariant, and the page's earlier-versions list is built on it holding.
    const sequence = ['A', 'A', 'B', '', 'B', 'C', 'A'];
    for (const [index, text] of sequence.entries()) {
      const live = loadResponse(db, 'ACT-FIX-01', 'prediction');
      const outcome = saveResponse(
        db,
        write({
          text,
          expectedRevision: live?.revision ?? 0,
          updatedAt: `2026-09-23T1${index}:00:00.000Z`,
        }),
      );
      expect(outcome.state, `write ${index + 1} of ${sequence.length}`).toBe('saved');

      const newest = allRevisions(db)[0];
      expect(newest?.text, `after write ${index + 1}`).toBe(text);
      expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe(text);
    }
  });

  it('keeps every field’s and every activity’s history to itself', () => {
    db = openDatabase(':memory:');

    writeAll(db, ['p1', 'p2'], { fieldName: 'prediction' });
    writeAll(db, ['o1'], { fieldName: 'observation' });
    writeAll(db, ['other activity'], { activityId: 'ACT-FIX-02' });

    expect(allRevisions(db, 'ACT-FIX-01', 'prediction').map((one) => one.text)).toEqual([
      'p2',
      'p1',
    ]);
    expect(allRevisions(db, 'ACT-FIX-01', 'observation').map((one) => one.text)).toEqual(['o1']);
    expect(allRevisions(db, 'ACT-FIX-02', 'prediction').map((one) => one.text)).toEqual([
      'other activity',
    ]);
  });
});

describe('reading the earlier versions back', () => {
  it('answers every revision but the newest, newest first', () => {
    db = openDatabase(':memory:');
    writeAll(db, ['first', 'second', 'third']);

    const earlier = loadEarlierRevisions(db, ['ACT-FIX-01']);

    expect(earlier.map((one) => [one.revision, one.text])).toEqual([
      [2, 'second'],
      [1, 'first'],
    ]);
  });

  it('carries each earlier version’s own content version and the time it was written', () => {
    db = openDatabase(':memory:');
    saveResponse(
      db,
      write({
        text: 'under the old wording',
        contentVersion: '1.0.0-draft',
        updatedAt: '2026-09-23T10:00:00.000Z',
      }),
    );
    saveResponse(
      db,
      write({ text: 'under the new', contentVersion: '1.0.1-draft', expectedRevision: 1 }),
    );

    const earlier = loadEarlierRevisions(db, ['ACT-FIX-01']);

    expect(earlier).toHaveLength(1);
    expect(earlier[0]?.contentVersion).toBe('1.0.0-draft');
    expect(earlier[0]?.writtenAt).toBe('2026-09-23T10:00:00.000Z');
  });

  it('answers nothing for a field written exactly once', () => {
    db = openDatabase(':memory:');
    writeAll(db, ['the only answer']);

    expect(loadEarlierRevisions(db, ['ACT-FIX-01'])).toEqual([]);
  });

  it('answers nothing for an activity nothing has been written against', () => {
    db = openDatabase(':memory:');

    expect(loadEarlierRevisions(db, ['ACT-FIX-01'])).toEqual([]);
    expect(loadEarlierRevisions(db, [])).toEqual([]);
  });

  it('answers the fields of the activities asked for, and no others', () => {
    db = openDatabase(':memory:');
    writeAll(db, ['p1', 'p2'], { fieldName: 'prediction' });
    writeAll(db, ['o1', 'o2'], { fieldName: 'observation' });
    writeAll(db, ['e1', 'e2'], { activityId: 'ACT-FIX-02' });
    writeAll(db, ['x1', 'x2'], { activityId: 'ACT-ELSEWHERE' });

    const earlier = loadEarlierRevisions(db, ['ACT-FIX-01', 'ACT-FIX-02']);

    expect(earlier.map((one) => `${one.activityId}/${one.fieldName}/${one.text}`).sort()).toEqual([
      'ACT-FIX-01/observation/o1',
      'ACT-FIX-01/prediction/p1',
      'ACT-FIX-02/prediction/e1',
    ]);
  });

  it('does not treat one field’s highest revision as another field’s', () => {
    db = openDatabase(':memory:');
    // prediction reaches revision 3 while observation is still at 1. A MAX() taken across the
    // activity rather than across the field would hide observation's only revision — or expose
    // prediction's newest as an earlier version.
    writeAll(db, ['p1', 'p2', 'p3'], { fieldName: 'prediction' });
    writeAll(db, ['o1'], { fieldName: 'observation' });

    const earlier = loadEarlierRevisions(db, ['ACT-FIX-01']);

    expect(earlier.map((one) => `${one.fieldName}/${one.text}`)).toEqual([
      'prediction/p2',
      'prediction/p1',
    ]);
  });
});

describe('what survives', () => {
  it('reads every revision back after the process that wrote them is gone', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'educode-revisions-'));
    files.push(dir);
    const file = path.join(dir, 'records.sqlite');

    const first = openDatabase(file);
    writeAll(first, ['I think it 404s.', 'It answered 200.']);
    first.close();

    db = openDatabase(file);
    const earlier = loadEarlierRevisions(db, ['ACT-FIX-01']);
    expect(earlier.map((one) => [one.revision, one.text, one.contentVersion])).toEqual([
      [1, 'I think it 404s.', '1.0.0-draft'],
    ]);
    expect(allRevisions(db)).toHaveLength(2);
  });

  it('offers no way to change or remove a revision', async () => {
    const source = fs.readFileSync(
      new URL('./responseRepository.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      'utf8',
    );

    // ADR 0012's "never edited and never deleted" has to be a property of the module, not a habit
    // of its callers: an UPDATE or DELETE against this table anywhere in the repository is the one
    // statement that could make an earlier answer disappear.
    //
    // The positive control comes first on purpose. Every assertion below is a negative, and a
    // negative about a table nobody writes to holds for the most boring reason there is — so this
    // proves the grep is aimed at text that exists before it is trusted to say that other text
    // does not.
    expect(source).toMatch(/INSERT\s+INTO\s+learner_response_revision/i);
    expect(source).not.toMatch(/UPDATE\s+learner_response_revision/i);
    expect(source).not.toMatch(/DELETE\s+FROM\s+learner_response_revision/i);

    const exports = await import('./responseRepository.js');
    expect(
      Object.keys(exports).filter((name) => /delete|remove|prune|clear|forget/i.test(name)),
    ).toEqual([]);
  });
});
