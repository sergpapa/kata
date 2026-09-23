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

/**
 * One accepted write, kept as it was made (ADR 0012).
 *
 * `revision` is the number the live record took from this write, so it can have gaps — a save that
 * repeated the stored text took a number and appended nothing.
 */
export interface StoredRevision {
  readonly activityId: string;
  readonly fieldName: string;
  readonly revision: number;
  readonly candidateLessonId: string;
  /** The version of the lesson **this text** was answering, not the one the live record names. */
  readonly contentVersion: string;
  readonly releaseId: string;
  readonly text: string;
  readonly writtenAt: string;
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

interface RevisionRow {
  activity_id: string;
  field_name: string;
  revision: number;
  candidate_lesson_id: string;
  content_version: string;
  release_id: string;
  text: string;
  written_at: string;
}

function toRevision(row: RevisionRow): StoredRevision {
  return {
    activityId: row.activity_id,
    fieldName: row.field_name,
    revision: row.revision,
    candidateLessonId: row.candidate_lesson_id,
    contentVersion: row.content_version,
    releaseId: row.release_id,
    text: row.text,
    writtenAt: row.written_at,
  };
}

/**
 * Every recorded revision of the named activities' fields **except each field's newest**, newest
 * first — which is exactly the set the reader has superseded.
 *
 * The exclusion is per field, not per activity: `prediction` can be on its third revision while
 * `observation` is on its first, and a `MAX()` taken across the activity would hide the one and
 * expose the other.
 */
export function loadEarlierRevisions(
  db: Db,
  activityIds: readonly string[],
): readonly StoredRevision[] {
  if (activityIds.length === 0) return [];
  const slots = activityIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT activity_id, field_name, revision, candidate_lesson_id, content_version, release_id,
              text, written_at
         FROM learner_response_revision AS r
        WHERE activity_id IN (${slots})
          AND revision < (SELECT MAX(newer.revision)
                            FROM learner_response_revision AS newer
                           WHERE newer.activity_id = r.activity_id
                             AND newer.field_name = r.field_name)
        ORDER BY activity_id, field_name, revision DESC`,
    )
    .all(...activityIds) as RevisionRow[];
  return rows.map(toRevision);
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

    appendRevision(db, saved);
    return { state: 'saved', response: saved };
  });

  return attempt();
}

/**
 * Records the write that has just been accepted, unless it changed nothing (ADR 0012).
 *
 * Called from inside `saveResponse`'s transaction and nowhere else, which is what makes the live
 * record and its history one write: if this throws, the conditional write above it is rolled back
 * too, and the caller is told the save failed rather than being told it succeeded while its history
 * was lost.
 *
 * The read here is not the read-then-write ADR 0004 forbids. That rule is about the *decision to
 * write*, which was already made and already answered by its own statement's change count. This
 * runs after that statement, so the transaction holds SQLite's write lock and no other process can
 * be between the two. And it reads the revision table, which the write above did not touch.
 */
function appendRevision(db: Db, saved: StoredResponse): void {
  const newest = db
    .prepare(
      `SELECT text FROM learner_response_revision
        WHERE activity_id = ? AND field_name = ?
        ORDER BY revision DESC
        LIMIT 1`,
    )
    .get(saved.activityId, saved.fieldName) as { text: string } | undefined;

  // Character for character, not trimmed and not normalised: the owner's leading spaces and blank
  // lines are their text. A save that repeated it is still a save; it is just not a new version of
  // the work.
  if (newest && newest.text === saved.text) return;

  db.prepare(
    `INSERT INTO learner_response_revision
       (activity_id, field_name, revision, candidate_lesson_id, content_version, release_id,
        text, written_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    saved.activityId,
    saved.fieldName,
    saved.revision,
    saved.candidateLessonId,
    saved.contentVersion,
    saved.releaseId,
    saved.text,
    saved.updatedAt,
  );
}
