import { createContext, useContext, type ReactNode } from 'react';

/**
 * Which course the controls deep inside a lesson belong to (ADR 0018).
 *
 * A save box and a kit download sit several components below the page that knows the course, and
 * threading an id through the Markdown renderer and the activity placement to reach them would make
 * two modules that have nothing to do with courses carry one. The pages take the course as a prop;
 * they hand it down through this scope.
 *
 * No default: a control rendered outside a course would otherwise post to whichever course a
 * default named, which is a save filed under the wrong release rather than an error.
 */
const CourseId = createContext<string | null>(null);

export function CourseScope({ courseId, children }: { courseId: string; children: ReactNode }) {
  return <CourseId.Provider value={courseId}>{children}</CourseId.Provider>;
}

export function useCourseId(): string {
  const courseId = useContext(CourseId);
  if (courseId === null) {
    throw new Error('This control belongs to a course, and it was rendered outside a CourseScope.');
  }
  return courseId;
}

/** The base every course-scoped request is made under. Encoded, because an id is configuration. */
export function courseApi(courseId: string): string {
  return `/api/courses/${encodeURIComponent(courseId)}`;
}
