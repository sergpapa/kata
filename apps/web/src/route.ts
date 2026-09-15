import { useSyncExternalStore } from 'react';

/**
 * Addresses, not component state. A lesson has a URL because the reader's resume point will need
 * somewhere to return to, because the back button has to work, and because a title the owner can
 * copy or open in a new tab is a link — not a click handler.
 *
 * Hand-rolled rather than a router dependency: this app has two addresses.
 */

/** The three destinations the sidebar names whose work is not built yet. */
export const standbySections = ['practice', 'reviews', 'progress'] as const;
export type StandbySection = (typeof standbySections)[number];

export type Route =
  | { readonly kind: 'home' }
  | { readonly kind: 'lesson'; readonly candidateLessonId: string }
  | { readonly kind: 'standby'; readonly section: StandbySection }
  | { readonly kind: 'unknown'; readonly path: string };

export function parseRoute(pathname: string): Route {
  if (pathname === '/') return { kind: 'home' };

  const segments = pathname.split('/').filter((segment) => segment !== '');

  if (segments.length === 1) {
    const section = standbySections.find((name) => name === segments[0]);
    if (section) return { kind: 'standby', section };
  }

  if (segments.length === 2 && segments[0] === 'lessons') {
    // `decodeURIComponent` throws on a malformed escape such as `/lessons/%`. This runs during
    // render, so an uncaught throw here blanks the whole app instead of showing the address it
    // could not read.
    let candidateLessonId: string;
    try {
      candidateLessonId = decodeURIComponent(segments[1] as string);
    } catch {
      return { kind: 'unknown', path: pathname };
    }
    if (candidateLessonId !== '') return { kind: 'lesson', candidateLessonId };
  }

  return { kind: 'unknown', path: pathname };
}

/** Encoded, because a lesson key is content: nothing guarantees it has no `/` or space in it. */
export function lessonHref(candidateLessonId: string): string {
  return `/lessons/${encodeURIComponent(candidateLessonId)}`;
}

/**
 * `popstate` covers the back and forward buttons, but the browser fires nothing for a `pushState`
 * the app itself makes — so navigations are announced here as well.
 */
const listeners = new Set<() => void>();

export function navigate(href: string): void {
  if (href === window.location.pathname) return;
  window.history.pushState({}, '', href);
  // A new page starts at its top. Without this, following a lesson from halfway down the list
  // opens that lesson already scrolled past its title. Going *back* is left alone on purpose: the
  // browser restores the previous scroll position itself, which is what a reader expects.
  window.scrollTo(0, 0);
  for (const listener of [...listeners]) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}

export function useRoute(): Route {
  return parseRoute(
    useSyncExternalStore(
      subscribe,
      () => window.location.pathname,
      () => '/',
    ),
  );
}
