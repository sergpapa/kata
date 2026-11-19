import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repoRoot } from './config.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { removeDir } from './modules/content/testkit/releaseFixture.js';
import {
  blockWith,
  contextBlock,
  contextLine,
  exportApp,
  exportFile,
  fencedBlocks,
  fieldSection,
  labelledLine,
  LESSON_3,
  LESSON_3_DOC,
  linesOutsideFences,
  saveAll,
  section,
  STANDARD_ACTIVITIES,
  writeExportRelease,
  type ActivitySpec,
} from './modules/export/testkit/exportFixture.js';

/**
 * Criteria EX1–EX8 in docs/specs/export.md (ADR 0020): what the file says about the owner's work.
 *
 * The file is read the way its reader reads it — by heading — and every fact is checked inside the
 * section of the thing it describes. A version or an id printed somewhere in the file, but beside
 * the wrong lesson or the wrong text, passes a "contains" check and misleads the content author;
 * these tests are written so it fails.
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

const appVersion = (
  JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { version: string }
).version;

describe('the download (EX1)', () => {
  it.each([
    [{ from: 'FIX-LS-02', to: LESSON_3 }, 'EduCode_FIX_Lessons_02-03_2026-11-19.md'],
    [{ from: 'FIX-LS-01', to: 'FIX-LS-02' }, 'EduCode_FIX_Lessons_01-02_2026-11-19.md'],
  ])('answers Markdown as an attachment named for the range %j', async (range, name) => {
    const answer = await app().inject({
      method: 'GET',
      url: `/api/courses/FIX/export?from=${range.from}&to=${range.to}&conversations=0`,
    });

    expect(answer.statusCode).toBe(200);
    expect(answer.headers['content-type']).toMatch(/^text\/markdown;\s*charset=utf-8$/i);
    expect(answer.headers['content-disposition']).toBe(`attachment; filename="${name}"`);
  });

  it('dates the file by the UTC day, as every time in it is written', async () => {
    vi.setSystemTime(new Date('2026-11-19T23:30:00.000Z'));

    const answer = await app().inject({
      method: 'GET',
      url: `/api/courses/FIX/export?from=FIX-LS-01&to=${LESSON_3}`,
    });

    expect(answer.headers['content-disposition']).toBe(
      'attachment; filename="EduCode_FIX_Lessons_01-03_2026-11-19.md"',
    );
  });
});

describe('the context block (EX2)', () => {
  it('pairs each fact with its label', async () => {
    vi.setSystemTime(new Date('2026-11-19T10:15:30.000Z'));

    const file = await exportFile(app());

    expect(contextLine(file, 'Course')).toBe('Course: FIX — FIX test course');
    expect(contextLine(file, 'Release')).toBe(
      'Release: FIX-RELEASE version 1.0.0-draft (2026-09-11)',
    );
    expect(contextLine(file, 'App version')).toBe(`App version: ${appVersion}`);
    expect(contextLine(file, 'Exported')).toBe('Exported: 2026-11-19T10:15:30.000Z');
    expect(contextLine(file, 'Lessons')).toBe(
      'Lessons: 01 Lesson 1: the authored title to 03 Lesson 3: the authored title',
    );
    expect(contextLine(file, 'AI feedback conversations')).toBe(
      'AI feedback conversations: not included',
    );
    expect(contextBlock(file)).toContain('Only work the app acknowledged as saved is included.');
  });

  it('says conversations are included when they were asked for', async () => {
    const file = await exportFile(app(), { from: 'FIX-LS-01', to: LESSON_3, conversations: '1' });

    expect(contextLine(file, 'AI feedback conversations')).toBe(
      'AI feedback conversations: included',
    );
  });
});

describe('lessons (EX3)', () => {
  it('gives each lesson its own section, in manifest order, with its identity', async () => {
    const file = await exportFile(app());

    const at = ['FIX-DOC-01', 'FIX-DOC-02', LESSON_3_DOC].map((id) => file.indexOf(id));
    expect(at.every((one) => one >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);

    const expected = [
      ['FIX-DOC-01', 'Lesson 1: the authored title', 'FIX-LS-01', '1.0.0-draft', '01'],
      ['FIX-DOC-02', 'Lesson 2: the authored title', 'FIX-LS-02', '1.0.0-draft', '02'],
      [LESSON_3_DOC, 'Lesson 3: the authored title', LESSON_3, '3.0.0-draft', '03'],
    ] as const;
    for (const [doc, title, id, version, order] of expected) {
      const lesson = section(file, doc, 2);
      expect(lesson.split('\n')[0]).toBe(`## ${title}`);
      expect(labelledLine(lesson, 'Order')).toBe(`Order: ${order}`);
      expect(labelledLine(lesson, 'Lesson id')).toBe(`Lesson id: ${id}`);
      expect(labelledLine(lesson, 'Content version')).toBe(`Content version: ${version}`);
      expect(labelledLine(lesson, 'Document id')).toBe(`Document id: ${doc}`);
    }
    expect(section(file, 'FIX-DOC-02', 2)).toContain('This lesson has no recording activities.');
    expect(section(file, 'FIX-DOC-01', 2)).not.toContain(
      'This lesson has no recording activities.',
    );
  });

  it.each([
    [{ from: 'FIX-LS-02', to: LESSON_3 }, [], ['FIX-DOC-01', 'ACT-1-ZULU', 'ACT-1-ALPHA']],
    [{ from: 'FIX-LS-01', to: 'FIX-LS-02' }, ['FIX-DOC-01', 'FIX-DOC-02'], [LESSON_3_DOC]],
    [{ from: 'FIX-LS-01', to: 'FIX-LS-01' }, ['FIX-DOC-01'], ['FIX-DOC-02', LESSON_3_DOC]],
    [{ from: LESSON_3, to: LESSON_3 }, [LESSON_3_DOC], ['FIX-DOC-01', 'FIX-DOC-02']],
  ])('for %j carries exactly the lessons in that range', async (range, present, absent) => {
    const file = await exportFile(app(), range);

    for (const one of present) expect(file, one).toContain(one);
    for (const one of absent) expect(file, one).not.toContain(one);
    if (range.to !== LESSON_3) {
      expect(file).not.toContain('ACT-3-ONLY');
      expect(file).not.toContain('Lesson 3: the authored title');
    }
  });
});

describe('activities and fields (EX4)', () => {
  it('gives each activity its own section, in activity-set order, with its identity', async () => {
    const file = await exportFile(app());

    expect(file.indexOf('ACT-1-ZULU')).toBeLessThan(file.indexOf('ACT-1-ALPHA'));
    for (const one of STANDARD_ACTIVITIES) {
      const activity = section(file, one.activity_id, 3);
      expect(activity.split('\n')[0]).toBe(`### ${one.title}`);
      expect(labelledLine(activity, 'Activity id')).toBe(`Activity id: ${one.activity_id}`);
      expect(labelledLine(activity, 'Kind')).toBe(`Kind: ${one.kind}`);
      expect(labelledLine(activity, 'Source heading')).toBe(
        `Source heading: ${one.source_heading}`,
      );
    }
    expect(section(file, LESSON_3_DOC, 2)).toContain('ACT-3-ONLY');
    expect(section(file, 'FIX-DOC-01', 2)).not.toContain('ACT-3-ONLY');
  });

  it('heads each declared field with its label, in declared order', async () => {
    const file = await exportFile(app());

    const headings = (activityId: string) =>
      linesOutsideFences(section(file, activityId, 3)).filter((line) => line.startsWith('#### '));
    expect(headings('ACT-1-ZULU')).toEqual(['#### Your prediction', '#### What you observed']);
    expect(headings('ACT-1-ALPHA')).toEqual([
      '#### Your explanation',
      '#### Whether you used help',
      '#### author_named_field',
    ]);
  });
});

describe('each field’s answer (EX5)', () => {
  it('shows a saved answer under its own field, described by when and against what', async () => {
    const server = app();
    vi.setSystemTime(new Date('2026-11-19T09:30:00.000Z'));
    await saveAll(server, 'ACT-1-ZULU', 'observation', ['The status line said 404.']);

    const file = await exportFile(server);

    const observed = fieldSection(section(file, 'ACT-1-ZULU', 3), 'What you observed');
    expect(fencedBlocks(observed).map((block) => block.content)).toEqual([
      'The status line said 404.',
    ]);
    const description = blockWith(file, 'The status line said 404.').description;
    expect(description).toContain('2026-11-19T09:30:00.000Z');
    expect(description).toContain('1.0.0-draft');
    expect(description).toContain('FIX-RELEASE');
  });

  it('says No answer recorded for each field never answered, and only for those', async () => {
    const server = app();
    await saveAll(server, 'ACT-1-ZULU', 'prediction', ['It will answer 200.']);

    const file = await exportFile(server);

    const zulu = section(file, 'ACT-1-ZULU', 3);
    expect(fieldSection(zulu, 'Your prediction')).not.toContain('No answer recorded.');
    expect(fieldSection(zulu, 'What you observed')).toContain('No answer recorded.');
    const alpha = section(file, 'ACT-1-ALPHA', 3);
    for (const label of ['Your explanation', 'Whether you used help', 'author_named_field']) {
      expect(fieldSection(alpha, label), label).toContain('No answer recorded.');
    }
  });

  it('marks an answer the owner emptied, and still shows what it said before', async () => {
    const server = app();
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['A first thought.', '']);

    const file = await exportFile(server);

    const field = fieldSection(section(file, 'ACT-3-ONLY', 3), 'Your prediction');
    expect(field).toContain('Emptied');
    expect(field).not.toContain('No answer recorded.');
    expect(blockWith(field, 'A first thought.').description).toMatch(/revision 1\b/i);
  });
});

describe('earlier versions (EX6)', () => {
  it('follows the current text with each earlier revision, newest first', async () => {
    const server = app();
    vi.setSystemTime(new Date('2026-11-19T09:01:00.000Z'));
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['First wording.']);
    vi.setSystemTime(new Date('2026-11-19T09:02:00.000Z'));
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['Second wording.'], 1);
    vi.setSystemTime(new Date('2026-11-19T09:03:00.000Z'));
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['Third wording.'], 2);

    const file = await exportFile(server);

    const field = fieldSection(section(file, 'ACT-3-ONLY', 3), 'Your prediction');
    expect(fencedBlocks(field).map((block) => block.content)).toEqual([
      'Third wording.',
      'Second wording.',
      'First wording.',
    ]);
    const second = blockWith(file, 'Second wording.').description;
    expect(second).toMatch(/revision 2\b/i);
    expect(second).toContain('2026-11-19T09:02:00.000Z');
    const first = blockWith(file, 'First wording.').description;
    expect(first).toMatch(/revision 1\b/i);
    expect(first).toContain('2026-11-19T09:01:00.000Z');
  });

  it('names, beside each version, the content version and release that wording answered', async () => {
    const original = app();
    const revision = await saveAll(original, 'ACT-1-ZULU', 'prediction', ['Before the fix.']);
    const corrected = app(release({ corrected: true, releaseId: 'FIX-CORRECTED' }));
    await saveAll(corrected, 'ACT-1-ZULU', 'prediction', ['After the fix.'], revision);

    const file = await exportFile(corrected);

    const after = blockWith(file, 'After the fix.').description;
    expect(after).toContain('1.0.1-draft');
    expect(after).toContain('FIX-CORRECTED');
    const before = blockWith(file, 'Before the fix.').description;
    expect(before).toContain('1.0.0-draft');
    expect(before).toContain('FIX-RELEASE');
    expect(before).not.toContain('1.0.1-draft');
    expect(before).not.toContain('FIX-CORRECTED');
    expect(section(file, 'FIX-DOC-01', 2)).toContain('1.0.1-draft');
  });

  it('shows one block for a field answered once', async () => {
    const server = app();
    await saveAll(server, 'ACT-3-ONLY', 'prediction', ['Only ever this.']);

    const file = await exportFile(server);

    expect(fencedBlocks(section(file, 'ACT-3-ONLY', 3))).toHaveLength(1);
  });
});

describe('the owner’s text, verbatim (EX7)', () => {
  const hostile = [
    'First line',
    '## Not a heading',
    '- not a list item',
    '<script>alert(1)</script>',
    '```js',
    'const inside = "a fence of three";',
    '```',
    '````',
    'Ελληνικά ✓ and a tab\there',
  ].join('\n');

  it('keeps an answer byte-for-byte inside a fence longer than any it contains', async () => {
    const server = app();
    await saveAll(server, 'ACT-3-ONLY', 'prediction', [hostile]);

    const file = await exportFile(server);

    const block = blockWith(file, hostile);
    expect(/^(`+)/.exec(block.opener)?.[1]?.length).toBeGreaterThan(4);
    expect(linesOutsideFences(file)).not.toContain('## Not a heading');
    expect(linesOutsideFences(file)).not.toContain('<script>alert(1)</script>');
  });

  it('fences an earlier version as safely as the current one', async () => {
    const server = app();
    await saveAll(server, 'ACT-3-ONLY', 'prediction', [hostile, 'A plain rewrite.']);

    const file = await exportFile(server);

    expect(blockWith(file, hostile).description).toMatch(/revision 1\b/i);
    expect(linesOutsideFences(file)).not.toContain('## Not a heading');
  });

  it('keeps leading and trailing blank lines and indentation', async () => {
    const server = app();
    const spaced = '\n\n    indented four\n\ttabbed\n\n';
    await saveAll(server, 'ACT-3-ONLY', 'prediction', [spaced]);

    const file = await exportFile(server);

    expect(blockWith(file, spaced).content).toBe(spaced);
  });
});

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
