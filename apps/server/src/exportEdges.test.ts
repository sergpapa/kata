import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { makeTempDir, removeDir } from './modules/content/testkit/releaseFixture.js';
import { writeCourseRelease } from './modules/content/testkit/twoCourses.js';
import { appendTurn, startConversation } from './modules/feedback/feedbackRepository.js';
import {
  blockWith,
  exportApp,
  exportFile,
  fencedBlocks,
  fieldSection,
  linesOutsideFences,
  saveAll,
  section,
  STANDARD_ACTIVITIES,
  WHOLE_COURSE,
  writeExportRelease,
} from './modules/export/testkit/exportFixture.js';

/**
 * The defects `/code-review` found in the first Export build (docs/specs/export.md EX8, EX10),
 * each written as a failing test before its fix.
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

const DROPPED = '## Work this release no longer shows';

describe('a field the activity no longer declares (EX8)', () => {
  it('keeps the answer, in the closing section, under its activity and field', async () => {
    const before = exportApp(db, [{ id: 'FIX', dir: release() }]);
    await saveAll(before, 'ACT-1-ALPHA', 'help_used', ['I used the hint.']);
    await saveAll(before, 'ACT-1-ALPHA', 'explanation', ['Still asked for.']);
    const narrowed = STANDARD_ACTIVITIES.map((one) =>
      one.activity_id === 'ACT-1-ALPHA'
        ? { ...one, response_fields: ['explanation', 'author_named_field'] }
        : one,
    );
    const after = exportApp(db, [{ id: 'FIX', dir: release({ activities: narrowed }) }]);

    const file = await exportFile(after);

    expect(linesOutsideFences(file)).toContain(DROPPED);
    const closing = file.slice(file.indexOf(DROPPED));
    const field = fieldSection(section(closing, 'ACT-1-ALPHA', 3), 'Whether you used help');
    expect(fencedBlocks(field).map((block) => block.content)).toEqual(['I used the hint.']);
    expect(file.slice(0, file.indexOf(DROPPED))).not.toContain('I used the hint.');
    expect(closing).not.toContain('Still asked for.');
  });
});

describe('another course’s work on a shared lesson (EX8)', () => {
  it('is not this course’s dropped work', async () => {
    const other = writeCourseRelease(makeTempDir(), {
      releasePrefix: 'OTH',
      lessons: [
        { lessonId: 'FIX-LS-01', documentId: 'FIX-DOC-01' },
        { lessonId: 'OTH-LS-02', documentId: 'OTH-DOC-02' },
      ],
      activities: [{ activity_id: 'OTH-ACT-1', lesson_id: 'FIX-LS-01' }],
    });
    dirs.push(other);
    const server = exportApp(db, [
      { id: 'FIX', dir: release() },
      { id: 'OTH', dir: other },
    ]);
    const saved = await server.inject({
      method: 'PUT',
      url: '/api/courses/OTH/activities/OTH-ACT-1/responses/prediction',
      payload: { text: 'Written in the other course.', expectedRevision: 0 },
    });
    expect(saved.json()).toMatchObject({ state: 'saved' });

    const file = await exportFile(server);

    expect(file).not.toContain('Written in the other course.');
    expect(file).not.toContain('OTH-ACT-1');
    expect(file).not.toContain('Work this release no longer shows');
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
