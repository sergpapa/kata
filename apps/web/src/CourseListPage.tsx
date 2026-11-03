import { useApi } from './api.js';
import { ArrowRightIcon } from './icons.js';
import { RouteLink } from './RouteLink.js';
import { courseHref } from './route.js';
import type { CourseCard } from './releaseTypes.js';

/**
 * The home page once the app serves more than one course (multi-course C10): one card per course,
 * in config order, each opening that course's dashboard.
 *
 * A refused course keeps its card and shows the importer's own reason in place of its size, so the
 * owner sees which course is missing and why, rather than a list that silently got shorter.
 */
export function CourseListPage() {
  const answer = useApi('/api/courses');

  if (answer.state === 'reading') return <p role="status">Reading the courses…</p>;
  if (answer.state === 'unavailable') {
    return (
      <p role="alert" className="notice notice-bad">
        The local app did not answer: {answer.reason}
      </p>
    );
  }
  const courses = (answer.body as { courses?: unknown } | null)?.courses;
  if (answer.status !== 200 || !Array.isArray(courses)) {
    return (
      <p role="alert" className="notice notice-bad">
        The app answered in a shape this page cannot read.
      </p>
    );
  }

  return (
    <>
      <header className="page-title">
        <div>
          <p className="eyebrow">YOUR COURSES</p>
          <h1>Choose a course.</h1>
          <p className="lede">
            Each course has its own lessons, in its own order. A lesson two courses share keeps one
            set of your answers, whichever course you read it in.
          </p>
        </div>
      </header>

      <ul className="course-list">
        {(courses as readonly CourseCard[]).map((course) => (
          <li className="card course-card" key={course.courseId}>
            <h2>
              <RouteLink href={courseHref(course.courseId)}>
                {course.title}
                <ArrowRightIcon />
              </RouteLink>
            </h2>
            {course.state === 'imported' ? (
              <>
                {course.audience && <p>{course.audience}</p>}
                <p className="fine">
                  {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                </p>
              </>
            ) : (
              <p role="alert" className="notice notice-bad">
                {course.failure.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
