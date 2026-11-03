import type { Db } from '../lifecycle/database.js';
import { loadActivitySetText } from './repository.js';

/**
 * The full history of what each stored release claimed its IDs mean, for the cross-course check in
 * `courses.ts` (ADR 0018). Kept beside `repository.ts`, under the same rule that only these content
 * modules speak SQL about imported content (ADR 0002), and split from it to keep each file to one
 * job.
 */
/** What a stored release says each of its IDs means: lessons to documents, and its activity text. */
export interface StoredReleaseIdentities {
  readonly releaseId: string;
  readonly lessons: readonly { readonly candidateLessonId: string; readonly documentId: string }[];
  readonly activitySetText: string | undefined;
}

/**
 * Every release ever stored, with the IDs it claimed. Rows are append-only (ADR 0006), so this is
 * the full history of what each ID has meant — including releases of a course refused on this
 * start, whose answers may still be in the store under those IDs (ADR 0018).
 */
export function loadStoredReleaseIdentities(db: Db): StoredReleaseIdentities[] {
  const releases = db.prepare('SELECT id, release_id FROM content_release ORDER BY id').all() as {
    id: number;
    release_id: string;
  }[];
  const lessonsOf = db.prepare(
    'SELECT candidate_lesson_id, document_id FROM content_lesson WHERE release_row_id = ?',
  );
  return releases.map((row) => ({
    releaseId: row.release_id,
    lessons: (lessonsOf.all(row.id) as { candidate_lesson_id: string; document_id: string }[]).map(
      (lesson) => ({
        candidateLessonId: lesson.candidate_lesson_id,
        documentId: lesson.document_id,
      }),
    ),
    activitySetText: loadActivitySetText(db, row.id),
  }));
}
