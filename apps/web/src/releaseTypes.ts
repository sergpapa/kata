/** Mirrors what `GET /api/courses/:courseId/release` answers. Kept beside the page that reads it, not shared: the
 * server owns its own contract, and a shared type would invite the client to widen it. */

export interface LessonSummary {
  readonly order: number;
  readonly candidateLessonId: string;
  readonly contentVersion: string;
  readonly documentId: string;
  readonly module: string | null;
  readonly displayTitle: string;
  readonly manifestTitle: string;
  readonly sourcePath: string;
  readonly sha256: string;
  readonly labId: string | null;
}

export interface ReleaseSummary {
  readonly releaseId: string;
  readonly version: string;
  readonly date: string | null;
  readonly status: string | null;
  readonly audience: string | null;
  readonly manifestSha256: string;
  readonly importedAt: string;
}

export interface CourseIdentity {
  readonly courseId: string;
  readonly title: string;
}

/** One card's worth of a course, as `GET /api/courses` answers it. */
export type CourseCard =
  | (CourseIdentity & {
      readonly state: 'imported';
      readonly audience: string | null;
      readonly lessonCount: number;
    })
  | (CourseIdentity & { readonly state: 'failed'; readonly failure: ImportFailure });

export interface ImportFailure {
  readonly code: string;
  readonly message: string;
  readonly file: string | null;
}

export type ReleaseView =
  | { readonly state: 'reading' }
  | {
      readonly state: 'imported';
      readonly course: CourseIdentity;
      readonly release: ReleaseSummary;
      readonly lessons: readonly LessonSummary[];
    }
  | { readonly state: 'failed'; readonly failure: ImportFailure }
  | { readonly state: 'unavailable'; readonly reason: string };

/**
 * One activity the author wrote for a lesson, as `GET /api/lessons/:id` answers it. `sourceHeading`
 * is the placement instruction: the panel goes at the end of the section with that heading.
 */
export interface LessonActivity {
  readonly activityId: string;
  readonly lessonId: string;
  readonly kind: string;
  readonly title: string;
  readonly sourceHeading: string;
  readonly responseFields: readonly string[];
  /** Rendered only where the named section is absent, so the excerpt is never shown twice. */
  readonly promptMarkdown: string;
}

/**
 * One field the server has stored, as `GET /api/lessons/:id` answers it. A field never saved is
 * absent from the array rather than present and empty — "nothing is stored" and "an empty answer is
 * stored" are different facts, and only the second has a revision.
 */
export interface StoredResponse {
  readonly activityId: string;
  readonly fieldName: string;
  readonly text: string;
  readonly revision: number;
  readonly updatedAt: string;
  /**
   * Every recorded revision of this field except the one in `text`, newest first (ADR 0012).
   *
   * Optional only because an answer that omits it is a different fact from an answer that says
   * there are none: the page keeps what it already has rather than clearing a history it cannot
   * see. The server always sends it.
   */
  readonly earlierVersions?: readonly EarlierVersion[];
}

/**
 * One superseded answer, kept as it was written. `contentVersion` is the version of the lesson
 * this text was answering, which is the pairing the owner's review has to be able to check — it is
 * not necessarily the version the live record now names.
 */
export interface EarlierVersion {
  readonly revision: number;
  readonly text: string;
  readonly writtenAt: string;
  readonly contentVersion: string;
}

/**
 * The lab kit a lesson declares, as `GET /api/lessons/:id` answers it.
 *
 * `lessons` carries each sharing lesson's number beside its key because the number cannot be got
 * from the key: `LS-M021-01` is lesson 9. Nothing on this side ever parses a lesson id.
 */
export interface LabKit {
  readonly labId: string;
  readonly version: string;
  readonly fileName: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly lessons: readonly { readonly order: number; readonly candidateLessonId: string }[];
}
