import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { removeDir } from './modules/content/testkit/releaseFixture.js';
import { appendTurn, clearConversation } from './modules/feedback/feedbackRepository.js';
import {
  exportApp,
  exportFile,
  saveAll,
  STANDARD_ACTIVITIES,
  writeExportRelease,
} from './modules/export/testkit/exportFixture.js';
import {
  ALL,
  CURRENT_LABEL,
  earlierHeading,
  earlierSeeds,
  lesson1,
  lesson3,
} from './modules/export/testkit/earlierFixture.js';
import {
  blockWith,
  linesOutsideFences,
  section,
} from './modules/export/testkit/markdownReaders.js';

/**
 * EC11 in docs/specs/earlier-conversations.md: with `conversations=all`, each earlier conversation
 * under its own heading after the current one, newest first, its turns as EX10 writes them.
 *
 * Conversations are arranged straight into the store, as in exportConversations.test.ts: what is
 * under test is what the export reads.
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

describe('with earlier conversations (EC11)', () => {
  it('puts the current conversation first, then each earlier one under its own heading, newest first', async () => {
    const server = app();
    zuluHistory();

    const file = await exportFile(server, ALL);

    const zulu = section(file, 'ACT-1-ZULU', 3);
    const headings = linesOutsideFences(zulu).filter((line) => line.startsWith('#### '));
    expect(headings).toEqual([
      '#### Your prediction',
      '#### What you observed',
      `#### ${CURRENT_LABEL}`,
      earlierHeading('2026-11-19T09:00:00.000Z', '2026-11-19T09:50:00.000Z'),
      earlierHeading('2026-11-19T09:10:00.000Z', '2026-11-19T09:20:00.000Z'),
    ]);
  });

  it('writes each earlier conversation’s turns under its own heading, as EX10 writes turns', async () => {
    const server = app();
    zuluHistory();

    const file = await exportFile(server, ALL);

    const middle = section(
      file,
      earlierHeading('2026-11-19T09:10:00.000Z', '2026-11-19T09:20:00.000Z').slice(5),
      4,
    );
    expect(linesOutsideFences(middle)).toContain('Turn 1 · You · 2026-11-19T09:10:00.000Z');
    expect(middle).toContain('Middle attempt.');
    expect(middle).toContain('Reply to the middle attempt.');
    expect(middle).not.toContain('Oldest attempt.');
    expect(blockWith(file, 'Reply to the middle attempt.').description).toBe(
      'Turn 2 · Claude · claude-sonnet-5-5 · 2026-11-19T09:10:10.000Z',
    );
    expect(blockWith(file, 'Middle attempt.').description).toContain('Your prediction');
  });

  it('puts the later conversation first when two were started over at the same moment', async () => {
    const server = app();
    conversation({
      activityId: 'ACT-1-ZULU',
      sent: 'Started first.',
      reply: 'Reply to the first.',
      at: '2026-11-19T09:00:00.000Z',
      clearedAt: '2026-11-19T09:30:00.000Z',
    });
    conversation({
      activityId: 'ACT-1-ZULU',
      sent: 'Started second.',
      reply: 'Reply to the second.',
      at: '2026-11-19T09:10:00.000Z',
      clearedAt: '2026-11-19T09:30:00.000Z',
    });

    const file = await exportFile(server, ALL);

    const headings = linesOutsideFences(section(file, 'ACT-1-ZULU', 3)).filter((line) =>
      line.startsWith('#### AI'),
    );
    expect(headings).toEqual([
      earlierHeading('2026-11-19T09:10:00.000Z', '2026-11-19T09:30:00.000Z'),
      earlierHeading('2026-11-19T09:00:00.000Z', '2026-11-19T09:30:00.000Z'),
    ]);
  });

  it('writes an earlier conversation’s failed turn with its failure and the text that had arrived', async () => {
    const server = app();
    const id = conversation({
      activityId: 'ACT-1-ZULU',
      sent: 'Asked before a failed follow-up.',
      reply: 'A finished earlier reply.',
      at: '2026-11-19T09:00:00.000Z',
    });
    appendTurn(db, id, {
      role: 'learner',
      text: 'An earlier follow-up.',
      provenance: lesson1,
      at: '2026-11-19T09:01:00.000Z',
    });
    appendTurn(db, id, {
      role: 'claude',
      text: 'Partial earlier reply',
      model: null,
      outcome: 'failed',
      failure: 'Claude Code stopped mid-reply.',
      provenance: lesson1,
      at: '2026-11-19T09:01:30.000Z',
    });
    clearConversation(db, id, '2026-11-19T09:05:00.000Z');

    const file = await exportFile(server, ALL);

    const earlierSection = section(
      file,
      earlierHeading('2026-11-19T09:00:00.000Z', '2026-11-19T09:05:00.000Z').slice(5),
      4,
    );
    expect(earlierSection).toContain('Partial earlier reply');
    expect(blockWith(file, 'Partial earlier reply').description).toBe(
      'Turn 4 · Claude · model not reported · 2026-11-19T09:01:30.000Z · Failed: Claude Code stopped mid-reply.',
    );
  });

  it('shows the earlier conversations of an activity that has no current one', async () => {
    const server = app();
    conversation({
      activityId: 'ACT-3-ONLY',
      sent: 'Lesson 3 attempt.',
      reply: 'Reply in lesson 3.',
      at: '2026-11-19T09:30:00.000Z',
      clearedAt: '2026-11-19T09:40:00.000Z',
      provenance: lesson3,
    });

    const file = await exportFile(server, ALL);

    const only = section(file, 'ACT-3-ONLY', 3);
    const headings = linesOutsideFences(only).filter((line) => line.startsWith('#### AI'));
    expect(headings).toEqual([
      earlierHeading('2026-11-19T09:30:00.000Z', '2026-11-19T09:40:00.000Z'),
    ]);
    expect(only).toContain('Reply in lesson 3.');
  });

  it('leaves out a hidden conversation that never got a reply', async () => {
    const server = app();
    conversation({
      activityId: 'ACT-1-ZULU',
      sent: 'Asked, then Try again.',
      reply: null,
      at: '2026-11-19T09:00:00.000Z',
      clearedAt: '2026-11-19T09:01:00.000Z',
    });
    conversation({
      activityId: 'ACT-1-ZULU',
      sent: 'Answered, then Start over.',
      reply: 'A reply that was started over.',
      at: '2026-11-19T09:02:00.000Z',
      clearedAt: '2026-11-19T09:03:00.000Z',
    });

    const file = await exportFile(server, ALL);

    expect(file).toContain('A reply that was started over.');
    expect(file).not.toContain('Asked, then Try again.');
    expect(file).not.toContain('Claude did not finish within 3 minutes.');
  });

  it('still does not carry the conversations of an activity the release dropped', async () => {
    const gone = {
      activity_id: 'ACT-1-GONE',
      lesson_id: 'FIX-LS-01',
      title: 'Withdrawn practice',
      kind: 'kind-withdrawn',
      source_heading: 'Practice W heading',
      response_fields: ['prediction'],
    };
    const before = app(release({ activities: [...STANDARD_ACTIVITIES, gone] }));
    await saveAll(before, 'ACT-1-GONE', 'prediction', ['Dropped answer.']);
    conversation({
      activityId: 'ACT-1-GONE',
      sent: 'Asked on a dropped activity.',
      reply: 'An earlier reply on a dropped activity.',
      at: '2026-11-19T09:00:00.000Z',
      clearedAt: '2026-11-19T09:05:00.000Z',
    });

    const file = await exportFile(app(), ALL);

    expect(file).toContain('Work this release no longer shows');
    expect(file).not.toContain('An earlier reply on a dropped activity.');
  });
});
