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

/** Breaks a release on disk after writing it, so its import is refused. */
export function corruptLesson(dir: string): void {
  fs.appendFileSync(`${dir}/lessons/lesson-01.md`, '\nA line the manifest never hashed.\n');
}
