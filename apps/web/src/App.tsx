import { useEffect } from 'react';
import { useApi, type ApiResult } from './api.js';
import { courseApi } from './course.js';
import { CourseListPage } from './CourseListPage.js';
import { DashboardPage } from './DashboardPage.js';
import { LessonPage } from './LessonPage.js';
import { releaseViewOf } from './releaseView.js';
import { RouteLink } from './RouteLink.js';
import { LEGACY_COURSE_ID, lessonHref, replaceAddress, useRoute } from './route.js';
import { Shell } from './Shell.js';
import { StandbyPage } from './StandbyPage.js';

/**
 * One decision about which page the address names, inside the shell they all share.
 *
 * A course's release is fetched here rather than by its dashboard, because two things need it: the
 * page that lists the lessons, and the sidebar that states which course and release are loaded. A
 * second request for the same answer would be two chances to disagree. Outside a course nothing is
 * asked: there is no release to describe.
 */
export function App() {
  const route = useRoute();
  const courseId = route.kind === 'course' || route.kind === 'lesson' ? route.courseId : null;
  const answer = useApi(courseId ? `${courseApi(courseId)}/release` : null);
  const release = releaseViewOf(answer);

  // The one-course app's lesson address, forwarded in place so a bookmark keeps working and the
  // back button does not land on an address that only forwards again (multi-course C12).
  const legacyLesson = route.kind === 'legacyLesson' ? route.candidateLessonId : null;
  useEffect(() => {
    if (legacyLesson) replaceAddress(lessonHref(LEGACY_COURSE_ID, legacyLesson));
  }, [legacyLesson]);

  const missingCourse = courseId !== null && isCourseNotFound(answer);

  return (
    <Shell route={route} release={courseId && !missingCourse ? release : null}>
      {route.kind === 'home' && <CourseListPage />}
      {route.kind === 'course' && !missingCourse && (
        // Keyed by the course, so moving to another course builds a new dashboard rather than
        // drawing this one's resume answer under the other course's lessons for a commit.
        <DashboardPage key={route.courseId} courseId={route.courseId} view={release} />
      )}
      {/* Keyed by course and lesson, so opening another one builds a new page rather than re-using
          this one's state. Without it the foot panels survived the change and drew the previous
          lesson's activity under the new lesson's title for a commit. */}
      {route.kind === 'lesson' && !missingCourse && (
        <LessonPage
          key={`${route.courseId}:${route.candidateLessonId}`}
          courseId={route.courseId}
          candidateLessonId={route.candidateLessonId}
        />
      )}
      {route.kind === 'standby' && <StandbyPage section={route.section} />}
      {(route.kind === 'unknown' || missingCourse) && (
        <NoPageHere path={route.kind === 'unknown' ? route.path : window.location.pathname} />
      )}
    </Shell>
  );
}

/** The server's own word that the course in the address does not exist. */
function isCourseNotFound(answer: ApiResult): boolean {
  return (
    answer.state === 'answered' &&
    answer.status === 404 &&
    (answer.body as { error?: unknown } | null)?.error === 'course_not_found'
  );
}

function NoPageHere({ path }: { readonly path: string }) {
  return (
    <>
      <h1>There is no page at this address</h1>
      <p>
        Nothing in this app answers to <code>{path}</code>.
      </p>
      <p>
        <RouteLink href="/">All courses</RouteLink>
      </p>
    </>
  );
}
