/**
 * The shapes the release importer produces. A release either verifies whole or is refused whole:
 * there is no partial value, because a half-imported release is the failure the brief forbids.
 */

/** Every way a release can be refused. The code is stable; the message names the specific file. */
export type ImportFailureCode =
  | 'manifest_missing'
  | 'manifest_unreadable'
  | 'manifest_invalid'
  | 'unsupported_manifest_schema'
  | 'path_escapes_release'
  | 'file_missing'
  | 'file_unreadable'
  | 'hash_mismatch'
  | 'duplicate_lesson_id'
  | 'duplicate_lesson_order'
  | 'conflicting_lesson_id'
  | 'conflicting_document_id'
  | 'conflicting_version'
  | 'front_matter_missing'
  | 'front_matter_invalid'
  | 'title_missing'
  | 'lab_not_found'
  | 'duplicate_lab_id'
  | 'lab_lesson_mismatch'
  | 'activity_set_invalid'
  | 'duplicate_activity_id'
  | 'activity_lesson_mismatch';

export interface ImportFailure {
  readonly code: ImportFailureCode;
  /** Plain words the owner can act on, naming the file and what was wrong with it. */
  readonly message: string;
  /** The release-relative path at fault, or null when the manifest itself is the problem. */
  readonly file: string | null;
}

export interface VerifiedLesson {
  readonly order: number;
  /** The stable key, taken from the lesson file's front matter (handoff §4). */
  readonly candidateLessonId: string;
  readonly contentVersion: string;
  readonly documentId: string;
  readonly module: string | null;
  /** The first H1 of the lesson body, never the filename. */
  readonly displayTitle: string;
  /** What the manifest calls the lesson, kept beside the authored title rather than replacing it. */
  readonly manifestTitle: string;
  readonly sourcePath: string;
  readonly sha256: string;
  readonly frontMatter: Readonly<Record<string, unknown>>;
  readonly sourceText: string;
  readonly labId: string | null;
}

export interface VerifiedLabKit {
  readonly labId: string;
  readonly version: string;
  readonly sourcePath: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly lessonIds: readonly string[];
}

export interface VerifiedActivitySet {
  readonly sourcePath: string;
  readonly sha256: string;
  readonly sourceText: string;
}

export interface VerifiedRelease {
  readonly releaseId: string;
  readonly version: string;
  readonly date: string | null;
  readonly status: string | null;
  readonly audience: string | null;
  readonly sourceOfTruth: string | null;
  /** Hash of the manifest bytes, which is what makes an identical re-import recognisable. */
  readonly manifestSha256: string;
  readonly lessons: readonly VerifiedLesson[];
  readonly labKits: readonly VerifiedLabKit[];
  readonly activitySet: VerifiedActivitySet;
}

export type VerificationOutcome =
  | { readonly state: 'verified'; readonly release: VerifiedRelease }
  | { readonly state: 'failed'; readonly failure: ImportFailure };

/** What the reader needs to list the lessons: identity and titles, no lesson bodies. */
export interface StoredLessonSummary {
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

/**
 * One stored lesson in full: the summary plus the two columns the reader needs and the list does
 * not — the authored file's own bytes and its parsed front matter.
 */
export interface StoredLessonDetail extends StoredLessonSummary {
  readonly frontMatter: Readonly<Record<string, unknown>>;
  readonly sourceText: string;
}

export interface StoredReleaseSummary {
  readonly releaseId: string;
  readonly version: string;
  readonly date: string | null;
  readonly status: string | null;
  readonly audience: string | null;
  readonly manifestSha256: string;
  readonly importedAt: string;
  readonly lessons: readonly StoredLessonSummary[];
}

/** The outcome of the import the app started with, carried for the lifetime of the process. */
export type ReleaseState =
  | { readonly state: 'imported'; readonly releaseRowId: number }
  | { readonly state: 'failed'; readonly failure: ImportFailure };
