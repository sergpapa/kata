import type { Db } from '../lifecycle/database.js';

/**
 * The only module that may speak SQL about learner responses (ADR 0002, ADR 0004, ADR 0011).
 *
 * The one rule this file exists to enforce: **a write decides its own outcome**. The revision the
 * client believes it is editing goes into the `WHERE` clause, and how many rows the statement
 * reports changing is the answer. Reading the row first and then writing would pass every test in
 * this repository — `better-sqlite3` is synchronous, so nothing in this process can interleave —
 * and would still lose a second process's work, which is the failure ADR 0004 exists to prevent.
 *
 * Storage is dumb on purpose, as it is for the resume point: whether the activity is one the
 * imported release carries, and whether the field is one its author declared, are the endpoint's
 * questions, asked against the release.
 */

/** One stored field, as the record store holds it. */
export interface StoredResponse {
  readonly activityId: string;
  readonly fieldName: string;
  /** The lesson, version and release the **latest accepted write** was made under (ADR 0011). */
  readonly candidateLessonId: string;
  readonly contentVersion: string;
  readonly releaseId: string;
  readonly text: string;
  readonly revision: number;
  readonly updatedAt: string;
}

/** One attempted write, carrying the revision the writer believes it is editing. */
export interface ResponseWrite {
  readonly activityId: string;
  readonly fieldName: string;
  readonly candidateLessonId: string;
  readonly contentVersion: string;
  readonly releaseId: string;
  readonly text: string;
  /** 0 means "I believe nothing is stored for this field". */
  readonly expectedRevision: number;
  readonly updatedAt: string;
}

export type ResponseWriteOutcome =
  | { readonly state: 'saved'; readonly response: StoredResponse }
  /**
   * The write was refused and nothing changed. `stored` is what is actually there — undefined when
   * the writer expected a revision for a field that has never been written.
   */
  | { readonly state: 'conflict'; readonly stored: StoredResponse | undefined };

interface ResponseRow {
  activity_id: string;
  field_name: string;
  candidate_lesson_id: string;
  content_version: string;
  release_id: string;
  text: string;
  revision: number;
  updated_at: string;
}

function toResponse(row: ResponseRow): StoredResponse {
  return {
    activityId: row.activity_id,
    fieldName: row.field_name,
    candidateLessonId: row.candidate_lesson_id,
    contentVersion: row.content_version,
    releaseId: row.release_id,
    text: row.text,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

const SELECT_ONE = `
  SELECT activity_id, field_name, candidate_lesson_id, content_version, release_id,
         text, revision, updated_at
    FROM learner_response
   WHERE activity_id = ? AND field_name = ?`;

export function loadResponse(
  db: Db,
  activityId: string,
  fieldName: string,
): StoredResponse | undefined {
  const row = db.prepare(SELECT_ONE).get(activityId, fieldName) as ResponseRow | undefined;
  return row ? toResponse(row) : undefined;
}

/** Every stored field of the named activities, for the page that is about to draw their boxes. */
export function loadResponsesForActivities(
  db: Db,
  activityIds: readonly string[],
): readonly StoredResponse[] {
  if (activityIds.length === 0) return [];
  const slots = activityIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT activity_id, field_name, candidate_lesson_id, content_version, release_id,
              text, revision, updated_at
         FROM learner_response
        WHERE activity_id IN (${slots})
        ORDER BY activity_id, id`,
    )
    .all(...activityIds) as ResponseRow[];
  return rows.map(toResponse);
}

/**
 * Stores one field if, and only if, the stored revision is the one the writer expected.
 *
 * Both branches are conditional writes, not a read followed by a decision. The insert leans on the
 * `(activity_id, field_name)` uniqueness constraint — `INSERT ... ON CONFLICT DO NOTHING` changes
 * no row when something is already there — and the update carries the revision in its `WHERE`.
 * Either way `changes === 0` means somebody else got there first, and the caller is handed what is
 * actually stored rather than a guess.
 */
export function saveResponse(db: Db, write: ResponseWrite): ResponseWriteOutcome {
  const attempt = db.transaction((): ResponseWriteOutcome => {
    const nextRevision = write.expectedRevision + 1;

    const result =
      write.expectedRevision === 0
        ? db
            .prepare(
              `INSERT INTO learner_response
                 (activity_id, field_name, candidate_lesson_id, content_version, release_id,
                  text, revision, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?)
               ON CONFLICT (activity_id, field_name) DO NOTHING`,
            )
            .run(
              write.activityId,
              write.fieldName,
              write.candidateLessonId,
              write.contentVersion,
              write.releaseId,
              write.text,
              write.updatedAt,
            )
        : db
            .prepare(
              `UPDATE learner_response
                  SET text = ?, revision = ?, updated_at = ?,
                      candidate_lesson_id = ?, content_version = ?, release_id = ?
                WHERE activity_id = ? AND field_name = ? AND revision = ?`,
            )
            .run(
              write.text,
              nextRevision,
              write.updatedAt,
              write.candidateLessonId,
              write.contentVersion,
              write.releaseId,
              write.activityId,
              write.fieldName,
              write.expectedRevision,
            );

    if (result.changes === 0) {
      return { state: 'conflict', stored: loadResponse(db, write.activityId, write.fieldName) };
    }

    const saved = loadResponse(db, write.activityId, write.fieldName);
    if (!saved) {
      throw new Error(
        `The write for ${write.activityId}/${write.fieldName} reported a change and stored nothing.`,
      );
    }
    return { state: 'saved', response: saved };
  });

  return attempt();
}
