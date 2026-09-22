/** Mirrors what `GET /api/release` answers. Kept beside the page that reads it, not shared: the
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

export interface ImportFailure {
  readonly code: string;
  readonly message: string;
  readonly file: string | null;
}

export type ReleaseView =
  | { readonly state: 'reading' }
  | {
      readonly state: 'imported';
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
}
