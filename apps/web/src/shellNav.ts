import { BookIcon, LayersIcon, MessageIcon, TerminalIcon } from './icons.js';
import type { ReleaseView } from './releaseTypes.js';
import { courseHref, type Route } from './route.js';

/**
 * What the shell says about where the reader is: the sidebar's destinations, which of them is
 * current, the breadcrumb trail and the course note. Split out of `Shell.tsx` when the second course
 * pushed it past the ~350-line guidance; these are pure functions of the address and the release,
 * and the shell's own job is focus, the drawer and layout.
 *
 * Three of the four destinations lead to work that is not built. They are still real addresses with
 * real pages, because the design package is explicit that a recreated label over a dead control is
 * worse than no label (decision 5 in docs/specs/visual-design-integration.md).
 */
export const destinations = [
  // Learn's address depends on where the reader is, so it is filled in per render (learnHrefFor).
  { href: null, label: 'Learn', Icon: BookIcon },
  { href: '/practice', label: 'Practice', Icon: TerminalIcon },
  { href: '/reviews', label: 'Reviews', Icon: MessageIcon },
  { href: '/progress', label: 'Progress', Icon: LayersIcon },
] as const;

/** The course an address is inside, if any: a course's dashboard and its lessons are. */
function courseOf(route: Route): string | null {
  return route.kind === 'course' || route.kind === 'lesson' ? route.courseId : null;
}

/**
 * Where Learn leads. Inside a course it is that course's dashboard, because "back to learning" from
 * a QA lesson means the QA lessons; everywhere else it is the course list (multi-course C13).
 */
export function learnHrefFor(route: Route): string {
  const courseId = courseOf(route);
  return courseId ? courseHref(courseId) : '/';
}

/** Which destination the current address belongs to. A course and its lessons belong to Learn. */
export function currentHref(route: Route): string | null {
  if (route.kind === 'home' || route.kind === 'course' || route.kind === 'lesson') {
    return learnHrefFor(route);
  }
  if (route.kind === 'standby') return `/${route.section}`;
  return null;
}

/** One breadcrumb. A crumb with an address is a way back; the last one is where the reader is. */
export interface Crumb {
  readonly text: string;
  readonly href?: string;
  /** The course's own crumb, which stays visible on a phone where the rest of the trail is hidden. */
  readonly course?: boolean;
}

/**
 * The trail always starts at EduCode, which leads to the course list, and inside a course names the
 * course second (design review 2026-11-03): on a phone the sidebar is a closed drawer, and the
 * trail is the only place the reader can see which course they are in.
 */
export function trailFor(
  route: Route,
  pageName: string | null,
  courseTitle: string | null,
): readonly Crumb[] {
  const home: Crumb = { text: 'EduCode', href: '/' };
  if (route.kind === 'home') return [{ text: 'EduCode' }, { text: 'Courses' }];
  if (route.kind === 'course') {
    return [
      home,
      { text: courseTitle ?? route.courseId, course: true },
      { text: 'Learning workspace' },
    ];
  }
  if (route.kind === 'lesson') {
    return [
      home,
      { text: courseTitle ?? route.courseId, href: courseHref(route.courseId), course: true },
      // The key until the lesson answers with its authored title: truthful, and already in the
      // address bar, so it is not new information the reader has to decode.
      { text: pageName ?? route.candidateLessonId },
    ];
  }
  if (route.kind === 'standby') {
    const label = destinations.find((entry) => entry.href === `/${route.section}`)?.label;
    return [home, { text: label ?? route.section }];
  }
  return [home, { text: 'Not found' }];
}

/**
 * What the sidebar can honestly say about the course's release: which course, who it is for, and
 * its size. Nothing outside a course, where no release was asked for.
 */
export function releaseNote(
  release: ReleaseView | null,
): { course: string; audience: string | null; count: number } | null {
  if (release?.state !== 'imported') return null;
  return {
    course: release.course.title,
    audience: release.release.audience,
    count: release.lessons.length,
  };
}
