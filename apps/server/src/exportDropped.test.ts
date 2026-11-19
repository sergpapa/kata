import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { makeTempDir, removeDir } from './modules/content/testkit/releaseFixture.js';
import { writeCourseRelease } from './modules/content/testkit/twoCourses.js';
import {
  exportApp,
  exportFile,
  saveAll,
  STANDARD_ACTIVITIES,
  writeExportRelease,
  type ActivitySpec,
} from './modules/export/testkit/exportFixture.js';
import {
  blockWith,
  fencedBlocks,
  fieldSection,
  linesOutsideFences,
  section,
} from './modules/export/testkit/markdownReaders.js';

/**
 * Criterion EX8 in docs/specs/export.md: work the release no longer shows — a dropped activity, a
 * field an activity no longer declares — and another course's work, which is never this course's.
 * Gathered from `export.test.ts` and the code review's tests by the file-size rule; unchanged.
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

const DROPPED = '## Work this release no longer shows';

describe('work this release no longer shows (EX8)', () => {
  const withGone: readonly ActivitySpec[] = [
    ...STANDARD_ACTIVITIES,
    {
      activity_id: 'ACT-1-GONE',
      lesson_id: 'FIX-LS-01',
      title: 'Withdrawn practice',
      kind: 'kind-withdrawn',
      source_heading: 'Practice W heading',
      response_fields: ['prediction'],
    },
    {
      activity_id: 'ACT-2-GONE',
      lesson_id: 'FIX-LS-02',
      title: 'Withdrawn from lesson 2',
      kind: 'kind-withdrawn',
      source_heading: 'Practice V heading',
      response_fields: ['prediction'],
    },
  ];
  const heading = '## Work this release no longer shows';

  async function answeredThenWithdrawn() {
    const before = app(release({ activities: withGone }));
    vi.setSystemTime(new Date('2026-11-19T09:05:00.000Z'));
    await saveAll(before, 'ACT-1-GONE', 'prediction', ['Old wording.']);
    vi.setSystemTime(new Date('2026-11-19T09:06:00.000Z'));
    await saveAll(before, 'ACT-1-GONE', 'prediction', ['Answer to a withdrawn one.'], 1);
    await saveAll(before, 'ACT-2-GONE', 'prediction', ['Answer in lesson 2.']);
    return app(release());
  }

  it('closes with the dropped answers, under their field, with their history', async () => {
    const file = await exportFile(await answeredThenWithdrawn());

    const lines = linesOutsideFences(file);
    expect(lines.filter((line) => line === heading)).toHaveLength(1);
    const closing = file.slice(file.indexOf(heading));
    expect(file.indexOf(heading)).toBeGreaterThan(file.indexOf('ACT-3-ONLY'));
    const field = fieldSection(section(closing, 'ACT-1-GONE', 3), 'Your prediction');
    expect(fencedBlocks(field).map((block) => block.content)).toEqual([
      'Answer to a withdrawn one.',
      'Old wording.',
    ]);
    const current = blockWith(file, 'Answer to a withdrawn one.').description;
    expect(current).toContain('2026-11-19T09:06:00.000Z');
    expect(current).toContain('1.0.0-draft');
    const earlier = blockWith(file, 'Old wording.').description;
    expect(earlier).toMatch(/revision 1\b/i);
    expect(earlier).toContain('2026-11-19T09:05:00.000Z');
    expect(earlier).toContain('FIX-RELEASE');
  });

  it('keeps dropped work out of the lessons’ own sections', async () => {
    const file = await exportFile(await answeredThenWithdrawn());

    const body = file.slice(0, file.indexOf(heading));
    expect(body).not.toContain('ACT-1-GONE');
    expect(body).not.toContain('Answer to a withdrawn one.');
  });

  it('leaves out dropped answers from lessons outside the range', async () => {
    const file = await exportFile(await answeredThenWithdrawn(), {
      from: 'FIX-LS-01',
      to: 'FIX-LS-01',
    });

    expect(file).toContain('Answer to a withdrawn one.');
    expect(file).not.toContain('Answer in lesson 2.');
    expect(file).not.toContain('ACT-2-GONE');
  });

  it('has no such section when nothing was dropped', async () => {
    const server = app();
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['Still listed.']);

    const file = await exportFile(server);

    expect(file).not.toContain('Work this release no longer shows');
  });
});

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
