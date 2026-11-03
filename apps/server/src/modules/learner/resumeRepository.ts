import type { Db } from '../lifecycle/database.js';

/**
 * The only module that may speak SQL about the resume point (ADR 0002, ADR 0010), one per course
 * (ADR 0018).
 *
 * Storage is dumb on purpose: whether the recorded lesson is one the course's imported release
 * actually carries is the endpoint's question, asked against that release — this module neither
 * validates nor deletes, because the record of what was opened is not rewritten by a release that
 * no longer carries it.
 */

export interface StoredResumePoint {
  readonly candidateLessonId: string;
  readonly recordedAt: string;
}

export function saveResumePoint(
  db: Db,
  courseId: string,
  candidateLessonId: string,
  recordedAt: string,
): void {
  db.prepare(
    `INSERT INTO course_resume_point (course_id, candidate_lesson_id, recorded_at) VALUES (?, ?, ?)
       ON CONFLICT (course_id) DO UPDATE SET candidate_lesson_id = excluded.candidate_lesson_id,
                                             recorded_at = excluded.recorded_at`,
  ).run(courseId, candidateLessonId, recordedAt);
}

export function loadResumePoint(db: Db, courseId: string): StoredResumePoint | undefined {
  const row = db
    .prepare('SELECT candidate_lesson_id, recorded_at FROM course_resume_point WHERE course_id = ?')
    .get(courseId) as { candidate_lesson_id: string; recorded_at: string } | undefined;
  if (!row) return undefined;
  return { candidateLessonId: row.candidate_lesson_id, recordedAt: row.recorded_at };
}
