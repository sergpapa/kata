import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, readSchemaVersion, type Db } from '../lifecycle/database.js';
import {
  loadResponse,
  loadResponsesForActivities,
  saveResponse,
  type ResponseWrite,
} from './responseRepository.js';

/**
 * Criteria S1–S8 in docs/specs/acknowledged-saves.md.
 *
 * These are the claims the four save states on the page stand on. If compare-and-set here is
 * really read-then-write, the page can still be made to show every state correctly while a second
 * tab's work is erased underneath it — so several of these assert what did *not* change, which is
 * the only way a refusal can be told apart from an accepted write that happened to store the same
 * text.
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
    updatedAt: '2026-09-22T10:00:00.000Z',
    ...over,
  };
}

describe('the learner response table', () => {
  it('leaves the schema at least at 4, where this table arrived', () => {
    db = openDatabase(':memory:');

    // Re-aim 3 in docs/specs/prediction-history.md. This test's claim was never "4 is the newest
    // schema" — that belongs to whichever slice migrated last, and app.test.ts holds it. What it
    // is here to pin is that opening a store brings learner_response into existence, which is
    // what every assertion below depends on.
    expect(Number(readSchemaVersion(db))).toBeGreaterThanOrEqual(4);
    expect(db.prepare('PRAGMA table_info(learner_response)').all()).not.toEqual([]);
  });

  it('stores one record per activity and field, not one per activity', () => {
    db = openDatabase(':memory:');

    saveResponse(db, write({ fieldName: 'prediction', text: 'predicted' }));
    saveResponse(db, write({ fieldName: 'observation', text: 'observed' }));

    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe('predicted');
    expect(loadResponse(db, 'ACT-FIX-01', 'observation')?.text).toBe('observed');
  });

  it('keeps the same field on two activities apart', () => {
    db = openDatabase(':memory:');

    saveResponse(db, write({ activityId: 'ACT-FIX-01', text: 'first' }));
    saveResponse(db, write({ activityId: 'ACT-FIX-02', text: 'second' }));

    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe('first');
    expect(loadResponse(db, 'ACT-FIX-02', 'prediction')?.text).toBe('second');
  });

  it('records the lesson, content version and release each write was made under', () => {
    db = openDatabase(':memory:');

    saveResponse(db, write());

    const stored = loadResponse(db, 'ACT-FIX-01', 'prediction');
    expect(stored?.candidateLessonId).toBe('FIX-LS-01');
    expect(stored?.contentVersion).toBe('1.0.0-draft');
    expect(stored?.releaseId).toBe('FIX-RELEASE');
    expect(stored?.updatedAt).toBe('2026-09-22T10:00:00.000Z');
  });

  it('moves the stamped version forward when a later write answers a corrected lesson (ADR 0011)', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ contentVersion: '1.0.0-draft' }));

    saveResponse(db, write({ expectedRevision: 1, contentVersion: '1.0.1-draft', text: 'again' }));

    const stored = loadResponse(db, 'ACT-FIX-01', 'prediction');
    expect(stored?.contentVersion).toBe('1.0.1-draft');
    expect(stored?.text).toBe('again');
  });
});

describe('the compare-and-set contract', () => {
  it('inserts the first accepted write at revision 1', () => {
    db = openDatabase(':memory:');

    const outcome = saveResponse(db, write({ expectedRevision: 0 }));

    expect(outcome.state).toBe('saved');
    expect(outcome.state === 'saved' && outcome.response.revision).toBe(1);
  });

  it('raises the revision by exactly one on each accepted write', () => {
    db = openDatabase(':memory:');

    saveResponse(db, write({ expectedRevision: 0 }));
    saveResponse(db, write({ expectedRevision: 1, text: 'second' }));
    const third = saveResponse(db, write({ expectedRevision: 2, text: 'third' }));

    expect(third.state === 'saved' && third.response.revision).toBe(3);
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe('third');
  });

  it('refuses a write whose expected revision is stale, and changes nothing', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ expectedRevision: 0, text: 'first tab' }));
    saveResponse(db, write({ expectedRevision: 1, text: 'second tab' }));

    const outcome = saveResponse(db, write({ expectedRevision: 1, text: 'stale overwrite' }));

    expect(outcome.state).toBe('conflict');
    const stored = loadResponse(db, 'ACT-FIX-01', 'prediction');
    expect(stored?.text).toBe('second tab');
    expect(stored?.revision).toBe(2);
  });

  it('hands the refused writer the current record, so the page can show it without asking again', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ expectedRevision: 0, text: 'first tab' }));

    const outcome = saveResponse(db, write({ expectedRevision: 0, text: 'racing tab' }));

    expect(outcome.state).toBe('conflict');
    expect(outcome.state === 'conflict' && outcome.stored?.text).toBe('first tab');
    expect(outcome.state === 'conflict' && outcome.stored?.revision).toBe(1);
  });

  it('refuses a write that expects a revision where nothing is stored', () => {
    db = openDatabase(':memory:');

    const outcome = saveResponse(db, write({ expectedRevision: 1 }));

    expect(outcome.state).toBe('conflict');
    expect(outcome.state === 'conflict' && outcome.stored).toBeUndefined();
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')).toBeUndefined();
  });

  it('refuses a revision ahead of the stored one, not only one behind it', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ expectedRevision: 0, text: 'stored' }));

    const outcome = saveResponse(db, write({ expectedRevision: 7, text: 'from the future' }));

    expect(outcome.state).toBe('conflict');
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe('stored');
  });

  it('stores an empty string as an edit, because withdrawing an answer is an answer', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ expectedRevision: 0, text: 'something' }));

    const outcome = saveResponse(db, write({ expectedRevision: 1, text: '' }));

    expect(outcome.state).toBe('saved');
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe('');
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.revision).toBe(2);
  });

  it('lets exactly one of two writers claiming the same revision through', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ expectedRevision: 0, text: 'original' }));

    // Both writers read revision 1 and believe they may proceed.
    const firstWriter = write({ expectedRevision: 1, text: 'writer A' });
    const secondWriter = write({ expectedRevision: 1, text: 'writer B' });

    const a = saveResponse(db, firstWriter);
    const b = saveResponse(db, secondWriter);

    expect(a.state).toBe('saved');
    expect(b.state).toBe('conflict');
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.text).toBe('writer A');
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')?.revision).toBe(2);
  });
});

/**
 * S5 and S8, which are claims about the code rather than about a value it returns.
 *
 * S5 is asserted by reading the statement, and that is a deliberate choice worth stating. The
 * property — that the decision to write is made by the write itself — matters because a second
 * process can move the row between a read and a write. But `better-sqlite3` is synchronous, so
 * nothing in this process can interleave inside a single `saveResponse` call, and a read-then-write
 * implementation would pass every behavioural test above. Racing it would need a second OS process,
 * which buys one assertion at the price of a flaky suite. Reading the SQL is the honest alternative,
 * and it is named here rather than left to look like laziness.
 */
describe('how the writes are actually made', () => {
  const source = fs.readFileSync(
    new URL('./responseRepository.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    'utf8',
  );

  it('makes the update itself conditional on the revision', () => {
    const update = /UPDATE\s+learner_response[\s\S]*?WHERE[\s\S]*?revision\s*=\s*\?/i;
    expect(source).toMatch(update);
  });

  it('decides the outcome from how many rows the write reported changing', () => {
    expect(source).toMatch(/\.changes/);
  });

  it('is the only module in the server that names the table', () => {
    const serverSrc = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue;
        if (full.endsWith(path.join('learner', 'responseRepository.ts'))) continue;
        if (full.endsWith(path.join('lifecycle', 'migrations.ts'))) continue;
        if (fs.readFileSync(full, 'utf8').includes('learner_response')) offenders.push(full);
      }
    };
    walk(serverSrc);

    expect(offenders).toEqual([]);
  });
});

describe('reading responses back', () => {
  it('answers every stored field of the activities asked for, and no others', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write({ activityId: 'ACT-FIX-01', fieldName: 'prediction', text: 'one' }));
    saveResponse(db, write({ activityId: 'ACT-FIX-01', fieldName: 'observation', text: 'two' }));
    saveResponse(db, write({ activityId: 'ACT-FIX-02', fieldName: 'prediction', text: 'three' }));
    saveResponse(
      db,
      write({ activityId: 'ACT-OTHER', fieldName: 'prediction', text: 'elsewhere' }),
    );

    const found = loadResponsesForActivities(db, ['ACT-FIX-01', 'ACT-FIX-02']);

    expect(found.map((one) => `${one.activityId}/${one.fieldName}`).sort()).toEqual([
      'ACT-FIX-01/observation',
      'ACT-FIX-01/prediction',
      'ACT-FIX-02/prediction',
    ]);
  });

  it('answers nothing for an activity with nothing stored, rather than an empty record', () => {
    db = openDatabase(':memory:');

    expect(loadResponsesForActivities(db, ['ACT-FIX-01'])).toEqual([]);
    expect(loadResponse(db, 'ACT-FIX-01', 'prediction')).toBeUndefined();
  });

  it('asks for nothing when given no activities', () => {
    db = openDatabase(':memory:');
    saveResponse(db, write());

    expect(loadResponsesForActivities(db, [])).toEqual([]);
  });
});

describe('surviving a restart', () => {
  it('reads back through a second handle opened after the first was closed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kata-responses-'));
    files.push(dir);
    const file = path.join(dir, 'records.sqlite');

    const first = openDatabase(file);
    saveResponse(first, write({ text: 'work that must survive' }));
    first.close();

    const second = openDatabase(file);
    try {
      const stored = loadResponse(second, 'ACT-FIX-01', 'prediction');
      expect(stored?.text).toBe('work that must survive');
      expect(stored?.revision).toBe(1);
      expect(stored?.contentVersion).toBe('1.0.0-draft');
    } finally {
      second.close();
    }
  });
});
