import {
  lessonSource,
  makeFixture,
  replaceActivitySet,
  replaceLessonFile,
  sha256,
  writeFixture,
} from './releaseFixture.js';

/**
 * A second fixture course beside the standard one, for tests of what two courses do to each other
 * (docs/specs/multi-course.md C2–C4, C8). The standard fixture is course `FIX` (`FIX-RELEASE`,
 * lessons `FIX-LS-01`/`FIX-LS-02`); this builds a release whose IDs carry another prefix, with
 * exactly the lessons and activities a test names.
 */
export interface FixtureActivitySpec {
  readonly activity_id: string;
  readonly lesson_id: string;
  readonly source_heading?: string;
}

export interface LessonSpec {
  readonly lessonId: string;
  readonly documentId: string;
  /** Defaults to `1.0.0-draft`. A shared lesson may stand at different versions in two courses. */
  readonly version?: string;
}

export interface CourseReleaseSpec {
  /** `release_id` becomes `<releasePrefix>-RELEASE`. */
  readonly releasePrefix: string;
  /** The two lessons' IDs and document IDs, in order. Defaults to `<prefix>-LS-0n` / `-DOC-0n`. */
  readonly lessons?: readonly [LessonSpec, LessonSpec];
  readonly activities?: readonly FixtureActivitySpec[];
  /** Defaults to the standard fixture's `Fixture`. Set it to tell two courses' answers apart. */
  readonly audience?: string;
  /** Drop lesson 2 and its kit, so the two courses also differ in size. */
  readonly singleLesson?: boolean;
}

export function writeCourseRelease(dir: string, spec: CourseReleaseSpec): string {
  const fixture = makeFixture();
  const prefix = spec.releasePrefix;
  const lessons = spec.lessons ?? [
    { lessonId: `${prefix}-LS-01`, documentId: `${prefix}-DOC-01` },
    { lessonId: `${prefix}-LS-02`, documentId: `${prefix}-DOC-02` },
  ];

  fixture.manifest.release_id = `${prefix}-RELEASE`;
  lessons.forEach(({ lessonId, documentId, version = '1.0.0-draft' }, index) => {
    const entry = fixture.manifest.lessons[index];
    if (!entry) throw new Error(`The standard fixture has no lesson ${index + 1}.`);
    entry.lesson_id = lessonId;
    entry.document_id = documentId;
    entry.version = version;
    replaceLessonFile(
      fixture,
      entry.path,
      lessonSource(
        [
          `document_id: ${documentId}`,
          `version: "${version}"`,
          `module: M020`,
          `candidate_lesson_id: ${lessonId}`,
        ].join('\n'),
        `# Lesson ${index + 1}: the authored title\n\nAuthored prose.\n\n## Practice A\n\nDo it.`,
      ),
    );
  });
  const lab = fixture.manifest.lab_downloads[0];
  if (lab) {
    lab.lesson_ids = [lessons[1].lessonId];
    // Bytes of its own per course, so a download served from the wrong course's directory is
    // visible as the wrong bytes rather than as an identical file.
    const kitBytes = Buffer.from(`PK ${prefix} kit bytes`, 'utf8');
    fixture.files.set(lab.path, kitBytes);
    lab.sha256 = sha256(kitBytes);
  }
  if (spec.audience !== undefined) fixture.manifest.audience = spec.audience;
  if (spec.singleLesson) {
    const second = fixture.manifest.lessons.pop();
    if (second) fixture.files.delete(second.path);
    for (const kit of fixture.manifest.lab_downloads.splice(0)) fixture.files.delete(kit.path);
  }

  const activities = (spec.activities ?? []).map((activity) => ({
    kind: 'interpretation',
    title: 'Practice A',
    source_heading: activity.source_heading ?? 'Practice A',
    response_fields: ['prediction', 'observation'],
    prompt_markdown: 'Do it.',
    ...activity,
  }));
  replaceActivitySet(fixture, `${JSON.stringify({ activities }, null, 2)}\n`);
  return writeFixture(dir, fixture);
}
