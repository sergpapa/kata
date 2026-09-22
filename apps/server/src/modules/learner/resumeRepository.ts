import type { Db } from '../lifecycle/database.js';

/**
 * The only module that may speak SQL about the resume point (ADR 0002, ADR 0010).
 *
 * Storage is dumb on purpose: whether the recorded lesson is one the imported release actually
 * carries is the endpoint's question, asked against the release — this module neither validates
 * nor deletes, because the record of what was opened is not rewritten by a release that no longer
 * carries it.
 */

export interface StoredResumePoint {
  readonly candidateLessonId: string;
  readonly recordedAt: string;
}

export function saveResumePoint(db: Db, candidateLessonId: string, recordedAt: string): void {
  db.prepare(
    `INSERT INTO resume_point (id, candidate_lesson_id, recorded_at) VALUES (1, ?, ?)
       ON CONFLICT (id) DO UPDATE SET candidate_lesson_id = excluded.candidate_lesson_id,
                                      recorded_at = excluded.recorded_at`,
  ).run(candidateLessonId, recordedAt);
}

export function loadResumePoint(db: Db): StoredResumePoint | undefined {
  const row = db
    .prepare('SELECT candidate_lesson_id, recorded_at FROM resume_point WHERE id = 1')
    .get() as { candidate_lesson_id: string; recorded_at: string } | undefined;
  if (!row) return undefined;
  return { candidateLessonId: row.candidate_lesson_id, recordedAt: row.recorded_at };
}
