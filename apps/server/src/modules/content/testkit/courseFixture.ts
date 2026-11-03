import type { CourseState, ReleaseState } from '../types.js';

/**
 * One course wrapped around a release a test has already imported (or refused), so a test that is
 * about one release can build the app the way it is built in production — from a course list —
 * without repeating the wiring. The id is the test's choice: `FIX` for the fixture release, whose
 * `release_id` is `FIX-RELEASE`, and `FSSE` for the real full-stack release.
 */
export function testCourse(
  courseId: string,
  releaseDir: string,
  release: ReleaseState,
): CourseState {
  return { courseId, title: `${courseId} test course`, releaseDir, release };
}
