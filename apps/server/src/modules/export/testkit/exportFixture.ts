import fs from 'node:fs';
import { buildApp } from '../../../app.js';
import { importRelease } from '../../content/service.js';
import { testCourse } from '../../content/testkit/courseFixture.js';
import {
  lessonSource,
  makeFixture,
  makeTempDir,
  replaceActivitySet,
  replaceLessonFile,
  sha256,
  writeFixture,
  type Fixture,
} from '../../content/testkit/releaseFixture.js';
import { writeCourseRelease } from '../../content/testkit/twoCourses.js';
import { inertFeedback } from '../../feedback/testkit/fakeRunner.js';
import type { Db } from '../../lifecycle/database.js';
import type { CourseState } from '../../content/types.js';

/**
 * The release and readers the export suites share (docs/specs/export.md).
 *
 * Three lessons, so a range can leave one out on either side: lesson 1 has two activities, lesson 2
 * none, lesson 3 one. Lesson 3's ids sort *before* lesson 1's (`FIX-A3`, `FIX-DOC-00`), so a file
 * or a range check that orders by id instead of by the manifest's `order` is visibly wrong. For the
 * same reason activity-set order and declared field order are not alphabetical, and the tests save
 * fields in neither order.
 */

export const LESSON_3 = 'FIX-A3';
export const LESSON_3_DOC = 'FIX-DOC-00';

export interface ActivitySpec {
  readonly activity_id: string;
  readonly lesson_id: string;
  readonly title: string;
  readonly kind: string;
  readonly source_heading: string;
  readonly response_fields: readonly string[];
}

export const STANDARD_ACTIVITIES: readonly ActivitySpec[] = [
  {
    activity_id: 'ACT-1-ZULU',
    lesson_id: 'FIX-LS-01',
    title: 'Zulu practice',
    kind: 'kind-interpretation',
    source_heading: 'Practice Z heading',
    response_fields: ['prediction', 'observation'],
  },
  {
    activity_id: 'ACT-1-ALPHA',
    lesson_id: 'FIX-LS-01',
    title: 'Alpha practice',
    kind: 'kind-reflection',
    source_heading: 'Practice A heading',
    response_fields: ['explanation', 'help_used', 'author_named_field'],
  },
  {
    activity_id: 'ACT-3-ONLY',
    lesson_id: LESSON_3,
    title: 'Only practice of lesson 3',
    kind: 'kind-investigation',
    source_heading: 'Practice C heading',
    response_fields: ['prediction'],
  },
];

function addThirdLesson(fixture: Fixture): void {
  const source = lessonSource(
    [
      `document_id: ${LESSON_3_DOC}`,
      'version: "3.0.0-draft"',
      'module: M020',
      `candidate_lesson_id: ${LESSON_3}`,
    ].join('\n'),
    '# Lesson 3: the authored title\n\nAuthored prose for lesson 3.',
  );
  fixture.files.set('lessons/lesson-03.md', Buffer.from(source, 'utf8'));
  fixture.manifest.lessons.push({
    order: 3,
    lesson_id: LESSON_3,
    document_id: LESSON_3_DOC,
    version: '3.0.0-draft',
    module: 'M020',
    title: 'Lesson 3 as the manifest names it',
    path: 'lessons/lesson-03.md',
    sha256: sha256(source),
    lab_id: null,
  });
}

/**
 * Writes the three-lesson release. `corrected` moves lesson 1 (and the release) to `1.0.1-draft`,
 * the authorized correction ADR 0011 stamps answers against; `releaseId` renames the release, so a
 * test can tell which release a revision was saved against.
 */
export function writeExportRelease(
  options: {
    corrected?: boolean;
    activities?: readonly ActivitySpec[];
    releaseId?: string;
  } = {},
): string {
  const dir = makeTempDir();
  const fixture = makeFixture();
  addThirdLesson(fixture);
  replaceActivitySet(
    fixture,
    `${JSON.stringify(
      {
        activities: (options.activities ?? STANDARD_ACTIVITIES).map((one) => ({
          ...one,
          prompt_markdown: `Prompt for ${one.title}.`,
        })),
      },
      null,
      2,
    )}\n`,
  );
  if (options.corrected) {
    replaceLessonFile(
      fixture,
      'lessons/lesson-01.md',
      lessonSource(
        [
          'document_id: FIX-DOC-01',
          'version: "1.0.1-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-01',
        ].join('\n'),
        '# Lesson 1: the authored title\n\nAuthored prose, corrected.',
      ),
    );
    const lesson = fixture.manifest.lessons.find((one) => one.lesson_id === 'FIX-LS-01');
    if (lesson) lesson.version = '1.0.1-draft';
    fixture.manifest.version = '1.0.1-draft';
  }
  if (options.releaseId) fixture.manifest.release_id = options.releaseId;
  return writeFixture(dir, fixture);
}

/** A second course's release (`OTH-RELEASE`, lessons `OTH-LS-01`/`02`) in a directory of its own. */
export function writeOtherCourseRelease(): string {
  return writeCourseRelease(makeTempDir(), { releasePrefix: 'OTH' });
}

/** Imports each directory into the same store and serves them as courses, in order. */
export function exportApp(db: Db, courses: readonly { id: string; dir: string }[]) {
  const states: CourseState[] = courses.map(({ id, dir }) =>
    testCourse(id, dir, importRelease(db, dir)),
  );
  return buildApp({ feedback: inertFeedback(), db, courses: states });
}

export type App = ReturnType<typeof exportApp>;

/** Saves texts into one field in sequence, each against the revision the previous save returned. */
export async function saveAll(
  app: App,
  activityId: string,
  fieldName: string,
  texts: readonly string[],
  startRevision = 0,
): Promise<number> {
  let revision = startRevision;
  for (const text of texts) {
    const answer = await app.inject({
      method: 'PUT',
      url: `/api/courses/FIX/activities/${activityId}/responses/${fieldName}`,
      payload: { text, expectedRevision: revision },
    });
    const body = answer.json() as { state?: string; revision?: number };
    if (body.state !== 'saved') throw new Error(`"${text}" was not saved: ${answer.body}`);
    revision = body.revision as number;
  }
  return revision;
}

export type ExportQuery = Readonly<Record<string, string | readonly string[] | undefined>>;

export function exportUrl(query: ExportQuery, courseId = 'FIX'): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    for (const one of typeof value === 'string' ? [value] : value) params.append(key, one);
  }
  return `/api/courses/${courseId}/export?${params.toString()}`;
}

export const WHOLE_COURSE = { from: 'FIX-LS-01', to: LESSON_3 } as const;

export async function exportFile(app: App, query: ExportQuery = WHOLE_COURSE): Promise<string> {
  const answer = await app.inject({ method: 'GET', url: exportUrl(query) });
  if (answer.statusCode !== 200) {
    throw new Error(`The export answered ${answer.statusCode}: ${answer.body}`);
  }
  return answer.body;
}

export interface FencedBlock {
  /** The opening fence line: three or more backticks and an optional info string. */
  readonly opener: string;
  /** Exactly the lines between the fences, joined with `\n`. */
  readonly content: string;
  /** The last non-blank line before the opening fence (EX6). */
  readonly description: string;
}

interface Line {
  readonly text: string;
  /** True for fence lines and every line between them. */
  readonly fenced: boolean;
}

/** Each line with whether it belongs to a fenced block, read as CommonMark reads backtick fences. */
function classify(markdown: string): Line[] {
  const lines: Line[] = [];
  let fence: string | null = null;
  for (const text of markdown.split('\n')) {
    if (fence === null) {
      const opener = /^(`{3,})[^`]*$/.exec(text);
      if (opener) fence = opener[1] as string;
      lines.push({ text, fenced: opener !== null });
    } else {
      const run = /^(`{3,})\s*$/.exec(text);
      if (run && (run[1] as string).length >= fence.length) fence = null;
      lines.push({ text, fenced: true });
    }
  }
  return lines;
}

/** The file's fenced blocks: each closes at the first line of only backticks at least as long. */
export function fencedBlocks(markdown: string): FencedBlock[] {
  const lines = markdown.split('\n');
  const blocks: FencedBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const opener = /^(`{3,})[^`]*$/.exec(lines[index] as string);
    if (!opener) {
      index += 1;
      continue;
    }
    const fence = opener[1] as string;
    let description = '';
    for (let back = index - 1; back >= 0; back -= 1) {
      if ((lines[back] as string).trim() !== '') {
        description = lines[back] as string;
        break;
      }
    }
    let close = index + 1;
    while (close < lines.length) {
      const run = /^(`{3,})\s*$/.exec(lines[close] as string);
      if (run && (run[1] as string).length >= fence.length) break;
      close += 1;
    }
    blocks.push({
      opener: lines[index] as string,
      content: lines.slice(index + 1, close).join('\n'),
      description,
    });
    index = close + 1;
  }
  return blocks;
}

/** The one block whose content is exactly `text`. Throws when there is none, or several. */
export function blockWith(markdown: string, text: string): FencedBlock {
  const found = fencedBlocks(markdown).filter((block) => block.content === text);
  if (found.length !== 1) {
    throw new Error(`Expected one block holding ${JSON.stringify(text)}, found ${found.length}.`);
  }
  return found[0] as FencedBlock;
}

/** Every line that is not inside a fenced block, fences included. */
export function linesOutsideFences(markdown: string): string[] {
  return classify(markdown)
    .filter((line) => !line.fenced)
    .map((line) => line.text);
}

function headingLevel(line: Line): number {
  if (line.fenced) return 0;
  const hashes = /^(#{1,6}) /.exec(line.text);
  return hashes ? (hashes[1] as string).length : 0;
}

/** Everything before the first `## ` heading: the context block (EX2). */
export function contextBlock(markdown: string): string {
  const lines = classify(markdown);
  const end = lines.findIndex((line) => headingLevel(line) === 2);
  return lines
    .slice(0, end === -1 ? lines.length : end)
    .map((line) => line.text)
    .join('\n');
}

/**
 * The section at heading `level` that holds the first unfenced line containing `marker`: from that
 * section's heading to the next heading of the same or a higher level. A lesson is level 2 (found
 * by its document id), an activity level 3 (by its activity id), a field level 4 (by its label).
 * Throws when the marker is not under a heading of that level, so a flat file fails loudly.
 */
export function section(markdown: string, marker: string, level: 2 | 3 | 4): string {
  const lines = classify(markdown);
  const at = lines.findIndex((line) => !line.fenced && line.text.includes(marker));
  if (at === -1) throw new Error(`No unfenced line contains ${JSON.stringify(marker)}.`);
  let start = at;
  while (start >= 0 && headingLevel(lines[start] as Line) !== level) {
    const found = headingLevel(lines[start] as Line);
    if (found !== 0 && found < level) start = -1;
    else start -= 1;
  }
  if (start < 0)
    throw new Error(`${JSON.stringify(marker)} is not inside a level-${level} section.`);
  let end = at + 1;
  while (end < lines.length) {
    const found = headingLevel(lines[end] as Line);
    if (found !== 0 && found <= level) break;
    end += 1;
  }
  return lines
    .slice(start, end)
    .map((line) => line.text)
    .join('\n');
}

/** The field section headed by `label` inside an activity's section. */
export function fieldSection(activity: string, label: string): string {
  const lines = activity.split('\n');
  const heading = lines.findIndex((line) => line === `#### ${label}`);
  if (heading === -1) throw new Error(`No "#### ${label}" heading in this activity.`);
  return section(lines.slice(heading).join('\n'), label, 4);
}

/** The first unfenced line of `text` carrying `key:`, without any `- ` list marker. */
export function labelledLine(text: string, key: string): string {
  const line = linesOutsideFences(text)
    .map((one) => one.replace(/^- /, ''))
    .find((one) => one.startsWith(`${key}:`));
  if (line === undefined) throw new Error(`No "${key}:" line here.`);
  return line;
}

/** The context block's line carrying `key:` (EX2). */
export function contextLine(markdown: string, key: string): string {
  return labelledLine(contextBlock(markdown), key);
}

/** Breaks a release on disk after writing it, so its import is refused. */
export function corruptLesson(dir: string): void {
  fs.appendFileSync(`${dir}/lessons/lesson-01.md`, '\nA line the manifest never hashed.\n');
}
