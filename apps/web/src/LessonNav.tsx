import { twoDigits } from './format.js';
import { courseHref, lessonHref } from './route.js';
import { RouteLink } from './RouteLink.js';
import { useCourseId } from './course.js';

/**
 * The lesson page's ways out, both inside the lesson's course (ADR 0018). Split out of
 * `LessonPage.tsx` when the course scope pushed it past the ~350-line guidance.
 */

/** Where a previous/next link points and what to call it — named by the server, which owns order. */
export interface LessonNeighbour {
  readonly order: number;
  readonly candidateLessonId: string;
  readonly displayTitle: string;
}

/** Back to the course's lesson list, at the top of every lesson state. */
export function BackToLessons() {
  return (
    <p className="lesson-back">
      <RouteLink href={courseHref(useCourseId())}>All lessons</RouteLink>
    </p>
  );
}

/**
 * The way on and the way back, at the foot of the lesson where a reader finishes. An absent
 * neighbour is an absent control: the first lesson simply has no "Previous", rather than a
 * disabled button that promises nothing (visual-design decision 5).
 */
export function NeighbourNav({
  previous,
  next,
}: {
  readonly previous: LessonNeighbour | null;
  readonly next: LessonNeighbour | null;
}) {
  const courseId = useCourseId();
  if (!previous && !next) return null;

  const link = (neighbour: LessonNeighbour, label: 'Previous' | 'Next') => (
    <RouteLink
      href={lessonHref(courseId, neighbour.candidateLessonId)}
      className={`neighbour neighbour-${label.toLowerCase()}`}
    >
      <span className="neighbour-kicker">
        {label} · Lesson {twoDigits(neighbour.order)}
      </span>
      <span className="neighbour-title">{neighbour.displayTitle}</span>
    </RouteLink>
  );

  return (
    <nav className="lesson-neighbours" aria-label="Between lessons">
      {previous && link(previous, 'Previous')}
      {next && link(next, 'Next')}
    </nav>
  );
}
