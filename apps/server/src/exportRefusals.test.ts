import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { removeDir } from './modules/content/testkit/releaseFixture.js';
import {
  corruptLesson,
  exportApp,
  exportFile,
  exportUrl,
  LESSON_3,
  WHOLE_COURSE,
  writeExportRelease,
  writeOtherCourseRelease,
  type ExportQuery,
} from './modules/export/testkit/exportFixture.js';

/**
 * Criteria EX13 and EX14 in docs/specs/export.md: what the export refuses, and a refused course.
 * Split out of `exportConversations.test.ts` by the file-size rule; the tests are unchanged.
 */

const dirs: string[] = [];
let db: Db;

beforeEach(() => {
  db = openDatabase(':memory:');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
  while (dirs.length > 0) removeDir(dirs.pop() as string);
});

function release(options: Parameters<typeof writeExportRelease>[0] = {}): string {
  const dir = writeExportRelease(options);
  dirs.push(dir);
  return dir;
}

function app(dir = release()) {
  return exportApp(db, [{ id: 'FIX', dir }]);
}

describe('refusals (EX13, EX14)', () => {
  async function refusal(query: ExportQuery) {
    const other = writeOtherCourseRelease();
    dirs.push(other);
    const server = exportApp(db, [
      { id: 'FIX', dir: release() },
      { id: 'OTH', dir: other },
    ]);
    const answer = await server.inject({ method: 'GET', url: exportUrl(query) });
    return {
      status: answer.statusCode,
      body: answer.json() as { error?: string; message?: string },
    };
  }

  it.each([
    ['from is missing', { to: LESSON_3 }, '`from`', '`to`'],
    ['to is missing', { from: 'FIX-LS-01' }, '`to`', '`from`'],
    ['from is empty', { from: '', to: LESSON_3 }, '`from`', '`to`'],
    ['to is empty', { from: 'FIX-LS-01', to: '' }, '`to`', '`from`'],
    ['from is given twice', { from: ['FIX-LS-01', 'FIX-LS-02'], to: LESSON_3 }, '`from`', '`to`'],
    ['to is given twice', { from: 'FIX-LS-01', to: [LESSON_3, 'FIX-LS-02'] }, '`to`', '`from`'],
  ])('answers 400 naming the parameter when %s', async (_, query, named, notNamed) => {
    const { status, body } = await refusal(query);

    expect(status).toBe(400);
    expect(typeof body.error).toBe('string');
    expect(body.message).toContain(named);
    expect(body.message).not.toContain(notNamed);
  });

  it.each([
    ['from is not a lesson', { from: 'NOPE-LS-09', to: LESSON_3 }, ['NOPE-LS-09']],
    ['to is not a lesson', { from: 'FIX-LS-01', to: 'NOPE-LS-10' }, ['NOPE-LS-10']],
    ['from is another course’s lesson', { from: 'OTH-LS-01', to: LESSON_3 }, ['OTH-LS-01']],
    ['to is another course’s lesson', { from: 'FIX-LS-01', to: 'OTH-LS-02' }, ['OTH-LS-02']],
    // LESSON_3 sorts before FIX-LS-01 by id, so only release order makes this backwards.
    ['from comes after to', { from: LESSON_3, to: 'FIX-LS-01' }, [LESSON_3, 'FIX-LS-01']],
    ['from comes after to by one', { from: 'FIX-LS-02', to: 'FIX-LS-01' }, ['FIX-LS-02']],
    ['conversations is a word', { ...WHOLE_COURSE, conversations: 'yes' }, ['`conversations`']],
    ['conversations is 2', { ...WHOLE_COURSE, conversations: '2' }, ['`conversations`']],
    ['conversations is empty', { ...WHOLE_COURSE, conversations: '' }, ['`conversations`']],
    [
      'conversations is given twice',
      { ...WHOLE_COURSE, conversations: ['1', '0'] },
      ['`conversations`'],
    ],
  ])('answers 400 naming the value when %s', async (_, query, named) => {
    const { status, body } = await refusal(query);

    expect(status).toBe(400);
    expect(typeof body.error).toBe('string');
    for (const one of named) expect(body.message).toContain(one);
  });

  it('accepts a range that runs from a lesson whose id sorts after the end’s', async () => {
    const file = await exportFile(app(), { from: 'FIX-LS-02', to: LESSON_3 });

    expect(file).toContain('ACT-3-ONLY');
  });

  it('answers a refused course’s failure, as its other routes do', async () => {
    const dir = release();
    corruptLesson(dir);
    const server = exportApp(db, [{ id: 'FIX', dir }]);

    const releaseAnswer = await server.inject({ method: 'GET', url: '/api/courses/FIX/release' });
    const answer = await server.inject({ method: 'GET', url: exportUrl(WHOLE_COURSE) });

    expect(releaseAnswer.json()).toMatchObject({ state: 'failed' });
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toEqual(releaseAnswer.json());
  });
});
