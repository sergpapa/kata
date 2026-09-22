import type { Db } from '../lifecycle/database.js';
import type {
  StoredLessonDetail,
  StoredLessonSummary,
  StoredReleaseSummary,
  VerifiedRelease,
} from './types.js';

/** The only module that may speak SQL about imported content (ADR 0002). */

interface ReleaseRow {
  id: number;
  release_id: string;
  release_version: string;
  release_date: string | null;
  status: string | null;
  audience: string | null;
  manifest_sha256: string;
  imported_at: string;
}

interface LessonDetailRow extends LessonRow {
  front_matter_json: string;
  source_text: string;
}

interface LessonRow {
  display_order: number;
  candidate_lesson_id: string;
  content_version: string;
  document_id: string;
  module: string | null;
  display_title: string;
  manifest_title: string;
  source_path: string;
  sha256: string;
  lab_id: string | null;
}

/**
 * Stores a verified release and returns the row that identifies it. Append-only by design: a
 * release whose bytes differ at all has a different manifest hash, so it becomes a second release
 * beside the first rather than an overwrite. Nothing may rewrite the rows an earlier prediction was
 * recorded against (docs/brief.md, hard constraints).
 *
 * Re-importing the identical release is a no-op that returns the row already stored, which is what
 * makes verifying on every start cheap enough to do.
 */
export function saveRelease(db: Db, release: VerifiedRelease): number {
  const store = db.transaction((): number => {
    const existing = db
      .prepare(
        'SELECT id FROM content_release WHERE release_id = ? AND release_version = ? AND manifest_sha256 = ?',
      )
      .get(release.releaseId, release.version, release.manifestSha256) as
      { id: number } | undefined;
    if (existing) return existing.id;

    const inserted = db
      .prepare(
        `INSERT INTO content_release
           (release_id, release_version, release_date, status, audience, source_of_truth,
            manifest_sha256, imported_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        release.releaseId,
        release.version,
        release.date,
        release.status,
        release.audience,
        release.sourceOfTruth,
        release.manifestSha256,
        new Date().toISOString(),
      );
    const releaseRowId = Number(inserted.lastInsertRowid);

    const insertLesson = db.prepare(
      `INSERT INTO content_lesson
         (release_row_id, display_order, candidate_lesson_id, content_version, document_id, module,
          display_title, manifest_title, source_path, sha256, front_matter_json, source_text, lab_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const lesson of release.lessons) {
      insertLesson.run(
        releaseRowId,
        lesson.order,
        lesson.candidateLessonId,
        lesson.contentVersion,
        lesson.documentId,
        lesson.module,
        lesson.displayTitle,
        lesson.manifestTitle,
        lesson.sourcePath,
        lesson.sha256,
        JSON.stringify(lesson.frontMatter),
        lesson.sourceText,
        lesson.labId,
      );
    }

    const insertLab = db.prepare(
      `INSERT INTO content_lab_kit
         (release_row_id, lab_id, lab_version, source_path, sha256, byte_size, lesson_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const kit of release.labKits) {
      insertLab.run(
        releaseRowId,
        kit.labId,
        kit.version,
        kit.sourcePath,
        kit.sha256,
        kit.byteSize,
        JSON.stringify(kit.lessonIds),
      );
    }

    db.prepare(
      `INSERT INTO content_activity_set (release_row_id, source_path, sha256, source_text)
       VALUES (?, ?, ?, ?)`,
    ).run(
      releaseRowId,
      release.activitySet.sourcePath,
      release.activitySet.sha256,
      release.activitySet.sourceText,
    );

    return releaseRowId;
  });

  return store();
}

/** Release identity and lesson titles, in reading order. No lesson bodies: the reader slice adds those. */
export function loadReleaseSummary(db: Db, releaseRowId: number): StoredReleaseSummary | undefined {
  const release = db
    .prepare(
      `SELECT id, release_id, release_version, release_date, status, audience, manifest_sha256,
              imported_at
         FROM content_release WHERE id = ?`,
    )
    .get(releaseRowId) as ReleaseRow | undefined;
  if (!release) return undefined;

  const lessons = db
    .prepare(
      `SELECT display_order, candidate_lesson_id, content_version, document_id, module,
              display_title, manifest_title, source_path, sha256, lab_id
         FROM content_lesson WHERE release_row_id = ? ORDER BY display_order`,
    )
    .all(releaseRowId) as LessonRow[];

  const summaries: StoredLessonSummary[] = lessons.map((row) => ({
    order: row.display_order,
    candidateLessonId: row.candidate_lesson_id,
    contentVersion: row.content_version,
    documentId: row.document_id,
    module: row.module,
    displayTitle: row.display_title,
    manifestTitle: row.manifest_title,
    sourcePath: row.source_path,
    sha256: row.sha256,
    labId: row.lab_id,
  }));

  return {
    releaseId: release.release_id,
    version: release.release_version,
    date: release.release_date,
    status: release.status,
    audience: release.audience,
    manifestSha256: release.manifest_sha256,
    importedAt: release.imported_at,
    lessons: summaries,
  };
}

/** What a previous/next link needs and nothing more: where it points and what to call it. */
export interface StoredNeighbour {
  readonly order: number;
  readonly candidateLessonId: string;
  readonly displayTitle: string;
}

/**
 * The lessons directly before and after a stored position, by `display_order` — the manifest's own
 * order, which is the only order this application recognises (spec P5).
 */
export function loadNeighbours(
  db: Db,
  releaseRowId: number,
  displayOrder: number,
): { previous: StoredNeighbour | null; next: StoredNeighbour | null } {
  const one = (comparison: '<' | '>', direction: 'DESC' | 'ASC'): StoredNeighbour | null => {
    const row = db
      .prepare(
        `SELECT display_order, candidate_lesson_id, display_title
           FROM content_lesson
          WHERE release_row_id = ? AND display_order ${comparison} ?
          ORDER BY display_order ${direction} LIMIT 1`,
      )
      .get(releaseRowId, displayOrder) as
      { display_order: number; candidate_lesson_id: string; display_title: string } | undefined;
    if (!row) return null;
    return {
      order: row.display_order,
      candidateLessonId: row.candidate_lesson_id,
      displayTitle: row.display_title,
    };
  };

  return { previous: one('<', 'DESC'), next: one('>', 'ASC') };
}

/** Whether the release carries the lesson, without lifting its text off disk. */
export function lessonExists(db: Db, releaseRowId: number, candidateLessonId: string): boolean {
  return (
    db
      .prepare('SELECT 1 FROM content_lesson WHERE release_row_id = ? AND candidate_lesson_id = ?')
      .get(releaseRowId, candidateLessonId) !== undefined
  );
}

/**
 * One lesson of one release, with the authored text and front matter the reader needs.
 *
 * Scoped to `releaseRowId` rather than looked up by lesson ID alone: a revised lesson is a new row
 * beside the old one, and a query that ignored the release would answer with whichever the database
 * happened to return first.
 */
export function loadLesson(
  db: Db,
  releaseRowId: number,
  candidateLessonId: string,
): StoredLessonDetail | undefined {
  const row = db
    .prepare(
      `SELECT display_order, candidate_lesson_id, content_version, document_id, module,
              display_title, manifest_title, source_path, sha256, lab_id, front_matter_json,
              source_text
         FROM content_lesson
        WHERE release_row_id = ? AND candidate_lesson_id = ?`,
    )
    .get(releaseRowId, candidateLessonId) as LessonDetailRow | undefined;
  if (!row) return undefined;

  return {
    order: row.display_order,
    candidateLessonId: row.candidate_lesson_id,
    contentVersion: row.content_version,
    documentId: row.document_id,
    module: row.module,
    displayTitle: row.display_title,
    manifestTitle: row.manifest_title,
    sourcePath: row.source_path,
    sha256: row.sha256,
    labId: row.lab_id,
    frontMatter: JSON.parse(row.front_matter_json) as Record<string, unknown>,
    sourceText: row.source_text,
  };
}

/**
 * The activity file's stored bytes, for one release. Derived into activities on the way out rather
 * than at import time (ADR 0005): the stored text stays canonical, so changing how an activity is
 * presented never requires re-importing a release.
 */
export function loadActivitySetText(db: Db, releaseRowId: number): string | undefined {
  const row = db
    .prepare('SELECT source_text FROM content_activity_set WHERE release_row_id = ?')
    .get(releaseRowId) as { source_text: string } | undefined;
  return row?.source_text;
}
