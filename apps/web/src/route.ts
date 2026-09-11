import { useSyncExternalStore } from 'react';

/**
 * Addresses, not component state. A lesson has a URL because the reader's resume point will need
 * somewhere to return to, because the back button has to work, and because a title the owner can
 * copy or open in a new tab is a link — not a click handler.
 *
 * Hand-rolled rather than a router dependency: this app has two addresses.
 */

export type Route =
  | { readonly kind: 'home' }
  | { readonly kind: 'lesson'; readonly candidateLessonId: string }
  | { readonly kind: 'unknown'; readonly path: string };

export function parseRoute(pathname: string): Route {
  if (pathname === '/') return { kind: 'home' };

  const segments = pathname.split('/').filter((segment) => segment !== '');
  if (segments.length === 2 && segments[0] === 'lessons') {
    const candidateLessonId = decodeURIComponent(segments[1] as string);
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
