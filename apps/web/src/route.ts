import { useSyncExternalStore } from 'react';

/**
 * Addresses, not component state. A lesson has a URL because the reader's resume point will need
 * somewhere to return to, because the back button has to work, and because a title the owner can
 * copy or open in a new tab is a link — not a click handler.
 *
 * Hand-rolled rather than a router dependency: this app has a handful of addresses.
 */

/** The three destinations the sidebar names whose work is not built yet. */
export const standbySections = ['practice', 'reviews', 'progress'] as const;
export type StandbySection = (typeof standbySections)[number];

export type Route =
  | { readonly kind: 'home' }
  | { readonly kind: 'course'; readonly courseId: string }
  | { readonly kind: 'lesson'; readonly courseId: string; readonly candidateLessonId: string }
  /** The one-course app's lesson address, kept so old bookmarks forward (multi-course C12). */
  | { readonly kind: 'legacyLesson'; readonly candidateLessonId: string }
  | { readonly kind: 'standby'; readonly section: StandbySection }
  | { readonly kind: 'unknown'; readonly path: string };

/** The course every pre-ADR-0018 address belonged to, because it was the only one. */
export const LEGACY_COURSE_ID = 'FSSE';

export function parseRoute(pathname: string): Route {
  if (pathname === '/') return { kind: 'home' };

  const segments = pathname.split('/').filter((segment) => segment !== '');
  // `decodeURIComponent` throws on a malformed escape such as `/lessons/%`. This runs during
  // render, so an uncaught throw here blanks the whole app instead of showing the address it
  // could not read.
  let decoded: string[];
  try {
    decoded = segments.map((segment) => decodeURIComponent(segment));
  } catch {
    return { kind: 'unknown', path: pathname };
  }
  const [first, second, third, fourth] = decoded;

  if (decoded.length === 1) {
    const section = standbySections.find((name) => name === first);
    if (section) return { kind: 'standby', section };
  }

  if (first === 'courses' && second) {
    if (decoded.length === 2) return { kind: 'course', courseId: second };
    if (decoded.length === 4 && third === 'lessons' && fourth) {
      return { kind: 'lesson', courseId: second, candidateLessonId: fourth };
    }
  }

  if (decoded.length === 2 && first === 'lessons' && second) {
    return { kind: 'legacyLesson', candidateLessonId: second };
  }

  return { kind: 'unknown', path: pathname };
}

/** Encoded, because a course id is configuration and nothing promises it is path-safe. */
export function courseHref(courseId: string): string {
  return `/courses/${encodeURIComponent(courseId)}`;
}

/** Encoded, because a lesson key is content: nothing guarantees it has no `/` or space in it. */
export function lessonHref(courseId: string, candidateLessonId: string): string {
  return `${courseHref(courseId)}/lessons/${encodeURIComponent(candidateLessonId)}`;
}

/**
 * One `popstate` listener for the whole app, and one place a navigation can be refused.
 *
 * The listener lives here rather than in whatever component cares, because ordering is the whole
 * problem: `popstate` fires after the browser has already moved, so the address has to be put back
 * before anything re-reads it. A listener registered by a component competes with the ones this
 * module's own subscribers add, and which of them runs first is an accident of mount order — get
 * it wrong and the lesson page unmounts, every field clears its unsaved mark, and the guard finds
 * nothing to protect.
 */
const listeners = new Set<() => void>();

/**
 * A veto on leaving the current address, installed by whatever has something to lose. Returning
 * `false` cancels the navigation; whoever said no is responsible for asking the reader.
 *
 * Kept as a registered function rather than an import of the unsaved-work registry: routing has no
 * business knowing what a response field is, and the next thing that needs to stop a navigation
 * should not have to edit this file.
 */
let guard: ((href: string) => boolean) | null = null;

export function setNavigationGuard(check: ((href: string) => boolean) | null): void {
  guard = check;
}

function currentHref(): string {
  return `${window.location.pathname}${window.location.hash}`;
}

/** The address the app believes it is on, kept whole so a refused move restores the section too. */
let here = typeof window === 'undefined' ? '/' : currentHref();

function announce(): void {
  // Recorded here rather than only in `navigate`, because the address can change without one: the
  // first paint, a `replaceState`, a hash the browser followed. Whatever has just settled is where
  // a later refused move has to put the reader back.
  here = currentHref();
  for (const listener of [...listeners]) listener();
}

function onPopState(): void {
  const wanted = currentHref();
  // A hash-only move is not leaving the page, so it is never refused: the reader jumping back from
  // a contents-list anchor has not asked to abandon anything.
  const leavingPage = window.location.pathname !== here.split('#')[0];
  if (leavingPage && guard && !guard(wanted)) {
    window.history.pushState({}, '', here);
    announce();
    return;
  }
  here = wanted;
  announce();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', onPopState);
}

/**
 * Moves to `href`, or refuses to. Answers whether it moved, so a caller that does something on the
 * way out — closing the drawer, say — does not do it for a move that never happened.
 */
export function navigate(href: string, force = false): boolean {
  if (href === currentHref()) return false;
  // `force` is the reader having been asked and having said go. It is not a way around the guard;
  // it is the guard's own answer coming back.
  if (!force && guard && !guard(href)) return false;
  here = href;
  window.history.pushState({}, '', href);
  // A new page starts at its top. Without this, following a lesson from halfway down the list
  // opens that lesson already scrolled past its title. Going *back* is left alone on purpose: the
  // browser restores the previous scroll position itself, which is what a reader expects.
  window.scrollTo(0, 0);
  announce();
  return true;
}

/**
 * Swaps the current address for `href` without a new history entry, and without the guard: used
 * only to forward an address that names no page of its own, so there is nothing to leave behind.
 */
export function replaceAddress(href: string): void {
  window.history.replaceState({}, '', href);
  announce();
}

function subscribe(onChange: () => void): () => void {
  // Something has started reading the address, so this is where the app believes it is.
  here = currentHref();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
}

export function useRoute(): Route {
  return parseRoute(usePathname());
}
