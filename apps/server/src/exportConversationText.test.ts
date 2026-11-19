import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { removeDir } from './modules/content/testkit/releaseFixture.js';
import {
  appendTurn,
  startConversation,
  type TurnProvenance,
} from './modules/feedback/feedbackRepository.js';
import {
  exportApp,
  exportFile,
  LESSON_3,
  saveAll,
  WHOLE_COURSE,
  writeExportRelease,
} from './modules/export/testkit/exportFixture.js';
import {
  blockWith,
  linesOutsideFences,
  section,
} from './modules/export/testkit/markdownReaders.js';

/**
 * Criteria EX7 and EX10 in docs/specs/export.md for what Claude and the owner wrote in a
 * conversation: fenced byte-for-byte, and a failure kept to its one turn line. Split out of
 * `exportConversations.test.ts` by the file-size rule; the tests are unchanged.
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

const WITH = { ...WHOLE_COURSE, conversations: '1' };

const lesson1: TurnProvenance = {
  candidateLessonId: 'FIX-LS-01',
  contentVersion: '1.0.0-draft',
  releaseId: 'FIX-RELEASE',
};
const lesson3: TurnProvenance = { ...lesson1, candidateLessonId: LESSON_3 };

describe('conversation text, verbatim (EX7)', () => {
  const reply = [
    'Here is how I would check it:',
    '```bash',
    'curl -i http://localhost:4317/',
    '```',
    '`````',
    '## Not a heading in a reply',
  ].join('\n');
  const followUp = 'Is this right?\n```\nGET / HTTP/1.1\n```';
  const sent = '````\n<b>bold</b>\n````';

  it('fences sent fields, follow-ups and replies byte-for-byte', async () => {
    const server = app();
    const { conversationId } = startConversation(db, {
      activityId: 'ACT-3-ONLY',
      sessionId: 'session-hostile',
      sentFields: [{ fieldName: 'prediction', text: sent }],
      provenance: lesson3,
      at: '2026-11-19T09:40:00.000Z',
    });
    appendTurn(db, conversationId, {
      role: 'claude',
      text: reply,
      model: 'claude-sonnet-5-5',
      outcome: 'complete',
      provenance: lesson3,
      at: '2026-11-19T09:40:10.000Z',
    });
    appendTurn(db, conversationId, {
      role: 'learner',
      text: followUp,
      provenance: lesson3,
      at: '2026-11-19T09:41:00.000Z',
    });

    const file = await exportFile(server, WITH);

    expect(blockWith(file, sent).description).toContain('Your prediction');
    expect(blockWith(file, reply).description).toMatch(/^Turn 2 · Claude/);
    expect(blockWith(file, followUp).description).toMatch(/^Turn 3 · You/);
    expect(/^(`+)/.exec(blockWith(file, reply).opener)?.[1]?.length).toBeGreaterThan(5);
    expect(linesOutsideFences(file)).not.toContain('## Not a heading in a reply');
  });
});

describe('a failure that runs over several lines (EX10)', () => {
  it('stays on its turn line and cannot break the file', async () => {
    const server = exportApp(db, [{ id: 'FIX', dir: release() }]);
    const provenance = {
      candidateLessonId: 'FIX-LS-01',
      contentVersion: '1.0.0-draft',
      releaseId: 'FIX-RELEASE',
    };
    const { conversationId } = startConversation(db, {
      activityId: 'ACT-1-ZULU',
      sessionId: 'session-multiline',
      sentFields: [{ fieldName: 'prediction', text: 'Sent text.' }],
      provenance,
      at: '2026-11-19T09:20:00.000Z',
    });
    appendTurn(db, conversationId, {
      role: 'claude',
      text: '',
      model: null,
      outcome: 'failed',
      failure: 'spawn failed\n## stderr\n```\r\nmore',
      provenance,
      at: '2026-11-19T09:20:05.000Z',
    });
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['An answer after the failure.']);

    const file = await exportFile(server, { ...WHOLE_COURSE, conversations: '1' });

    const outside = linesOutsideFences(file);
    expect(outside).not.toContain('## stderr');
    const line = outside.find((one) => one.startsWith('Turn 2 · Claude'));
    expect(line).toBe(
      'Turn 2 · Claude · model not reported · 2026-11-19T09:20:05.000Z · Failed: spawn failed ## stderr ``` more',
    );
    expect(blockWith(file, 'An answer after the failure.').description).toContain('revision 1');
    expect(section(file, 'ACT-3-ONLY', 3).split('\n')[0]).toBe('### Only practice of lesson 3');
  });
});
