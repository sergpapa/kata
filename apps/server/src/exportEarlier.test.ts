import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { removeDir } from './modules/content/testkit/releaseFixture.js';
import { appendTurn, clearConversation } from './modules/feedback/feedbackRepository.js';
import {
  exportApp,
  exportFile,
  exportUrl,
  WHOLE_COURSE,
  writeExportRelease,
} from './modules/export/testkit/exportFixture.js';
import { ALL, CURRENT, earlierSeeds, lesson1 } from './modules/export/testkit/earlierFixture.js';
import { contextLine } from './modules/export/testkit/markdownReaders.js';

/**
 * EC10 and EC12 in docs/specs/earlier-conversations.md: `conversations=all` is accepted where
 * nonsense is not, and `0` and `1` still carry no earlier conversation.
 *
 * Conversations are arranged straight into the store, as in exportConversations.test.ts: what is
 * under test is what the export reads. Each absence is checked against the same store exported
 * with `all`, so an export that never writes an earlier conversation cannot pass it.
 */

const dirs: string[] = [];
let db: Db;

beforeEach(() => {
  db = openDatabase(':memory:');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T12:00:00.000Z'));
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

const { conversation, zuluHistory } = earlierSeeds(() => db);

describe('the conversations parameter (EC10)', () => {
  it('accepts all', async () => {
    const answer = await app().inject({ method: 'GET', url: exportUrl(ALL) });
    expect(answer.statusCode).toBe(200);
  });

  it.each([
    ['ALL', 'ALL'],
    ['every', 'every'],
    ['empty', ''],
  ])('refuses %s, naming the parameter', async (_, value) => {
    const answer = await app().inject({
      method: 'GET',
      url: exportUrl({ ...WHOLE_COURSE, conversations: value }),
    });
    expect(answer.statusCode).toBe(400);
    expect(answer.json().message).toContain('`conversations`');
  });

  it('refuses all given twice', async () => {
    const answer = await app().inject({
      method: 'GET',
      url: exportUrl({ ...WHOLE_COURSE, conversations: ['all', 'all'] }),
    });
    expect(answer.statusCode).toBe(400);
    expect(answer.json().message).toContain('`conversations`');
  });
});

describe('the context line, and 0 and 1 unchanged (EC12)', () => {
  it('says earlier conversations are included only for all', async () => {
    const server = app();

    expect(contextLine(await exportFile(server, ALL), 'AI feedback conversations')).toBe(
      'AI feedback conversations: included, with earlier conversations',
    );
    expect(contextLine(await exportFile(server, CURRENT), 'AI feedback conversations')).toBe(
      'AI feedback conversations: included',
    );
  });

  it('carries no earlier conversation’s text, failure or model with 0 or 1', async () => {
    const server = app();
    zuluHistory();
    const earlierTexts = [
      'Oldest attempt.',
      'Reply to the oldest attempt.',
      'Middle attempt.',
      'Reply to the middle attempt.',
      'earlier conversation',
    ];

    const all = await exportFile(server, ALL);
    const current = await exportFile(server, CURRENT);
    const none = await exportFile(server, { ...WHOLE_COURSE, conversations: '0' });

    for (const text of earlierTexts) expect(all, text).toContain(text);
    expect(current).toContain('Reply to the current attempt.');
    for (const file of [current, none]) {
      for (const text of earlierTexts) expect(file, text).not.toContain(text);
    }
  });

  it('carries no earlier conversation’s model or failure with 0 or 1', async () => {
    const server = app();
    const id = conversation({
      activityId: 'ACT-1-ZULU',
      sent: 'Asked with a distinct model.',
      reply: 'Answered by a distinct model.',
      at: '2026-11-19T09:00:00.000Z',
      model: 'claude-model-only-in-an-earlier-conversation',
    });
    appendTurn(db, id, {
      role: 'learner',
      text: 'Then a follow-up.',
      provenance: lesson1,
      at: '2026-11-19T09:01:00.000Z',
    });
    appendTurn(db, id, {
      role: 'claude',
      text: '',
      model: null,
      outcome: 'failed',
      failure: 'A failure only an earlier conversation has.',
      provenance: lesson1,
      at: '2026-11-19T09:01:30.000Z',
    });
    clearConversation(db, id, '2026-11-19T09:05:00.000Z');
    const marks = [
      'claude-model-only-in-an-earlier-conversation',
      'A failure only an earlier conversation has.',
    ];

    const all = await exportFile(server, ALL);
    const current = await exportFile(server, CURRENT);
    const none = await exportFile(server, { ...WHOLE_COURSE, conversations: '0' });

    for (const mark of marks) expect(all, mark).toContain(mark);
    for (const file of [current, none]) {
      for (const mark of marks) expect(file, mark).not.toContain(mark);
    }
  });
});
