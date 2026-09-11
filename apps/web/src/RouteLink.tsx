import type { MouseEvent, ReactNode } from 'react';
import { navigate } from './route.js';

/**
 * A real anchor that happens to move within the app. It keeps a genuine `href`, so it is
 * focusable, announced as a link, openable in a new tab, and copyable — all of which a `button`
 * with a click handler throws away.
 *
 * Only a plain left click is intercepted. A modified click is the reader asking the browser for a
 * new tab or window, and that is the browser's business, not this app's.
 */
export function RouteLink({
  href,
  className,
  children,
}: {
  readonly href: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
