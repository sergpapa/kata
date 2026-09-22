import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { announceRoute, navigate, setNavigationGuard, usePathname } from './route.js';
import {
  hasUnsaved,
  holdNavigation,
  pendingNavigation,
  releaseNavigation,
  usePendingNavigation,
  useUnsavedEntries,
} from './unsavedGuard.js';

/**
 * The question the app asks before typed work disappears, and the three ways out of a lesson it
 * covers: a link, the back button, and a refresh.
 *
 * A link goes through `navigate`, which consults the guard installed here. The back button does
 * not — the browser has already moved by the time `popstate` arrives — so the address it left is
 * pushed back and the same dialog opens over it. A refresh or a closed tab cannot be shown a dialog
 * of ours at all, so it gets the browser's own, and only while something is actually unsaved.
 */
export function UnsavedDialog() {
  const entries = useUnsavedEntries();
  const pending = usePendingNavigation();
  const pathname = usePathname();
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  /** Where the reader was when the dialog took focus, so Stay can put them back. */
  const cameFrom = useRef<HTMLElement | null>(null);
  /** The address the reader is on, so `popstate` knows what to restore. */
  const here = useRef(typeof window === 'undefined' ? '/' : window.location.pathname);

  // The link path: `navigate` asks, and a veto holds the href for the dialog to act on.
  //
  // The cleanup drops a held navigation as well as the guard. A navigation held by a dialog that is
  // no longer on the page is a question nobody can answer, and the next thing to mount would find
  // it already waiting.
  useEffect(() => {
    setNavigationGuard((href) => {
      if (!hasUnsaved()) return true;
      holdNavigation(href);
      return false;
    });
    return () => {
      setNavigationGuard(null);
      releaseNavigation();
    };
  }, []);

  // The back and forward path. `popstate` fires after the browser has already changed the address,
  // so the guard puts it back and then asks — the alternative is a reader who is on another page
  // before being told what they lost.
  useEffect(() => {
    function onPopState(): void {
      const wanted = window.location.pathname;
      if (wanted === here.current) return;
      if (!hasUnsaved()) {
        here.current = wanted;
        return;
      }
      window.history.pushState({}, '', here.current);
      announceRoute();
      holdNavigation(wanted);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Keeps `here` honest for every navigation the guard let through. A held navigation is excluded:
  // during one, the address has deliberately been put back, and recording it would make the dialog
  // agree that the reader is already where they were trying to go.
  useEffect(() => {
    if (pendingNavigation() === null) here.current = pathname;
  }, [pathname]);

  // The refresh and tab-close path, registered only while there is something to lose. An always-on
  // handler makes every ordinary page reload ask a question with no answer behind it.
  useEffect(() => {
    if (entries.length === 0) return;
    function onBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [entries.length]);

  useEffect(() => {
    if (pending === null) return;
    cameFrom.current = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector('button')?.focus();
  }, [pending]);

  function stay(): void {
    releaseNavigation();
    cameFrom.current?.focus();
  }

  function leave(): void {
    const target = pending;
    releaseNavigation();
    if (target !== null) {
      here.current = target;
      // Forced, because this *is* the guard's answer: the reader was asked and said go.
      navigate(target, true);
    }
  }

  // Escape listens on the document rather than on the dialog, the way the drawer's does: focus can
  // legitimately be inside the dialog, on one of its buttons, or momentarily nowhere, and a reader
  // pressing Escape means the same thing in all three.
  useEffect(() => {
    if (pending === null) return;
    function onEscape(event: globalThis.KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      stay();
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  });

  if (pending === null) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Tab') return;

    const focusable = [...(dialog.current?.querySelectorAll('button') ?? [])];
    if (focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    // Both ends. A trap that only wraps forwards lets Shift+Tab off the first control and onto the
    // page behind, where every link still works and nothing has been answered.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="unsaved-scrim">
      <div
        className="unsaved-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialog}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>You have unsaved work on this lesson</h2>
        {/* Named, not counted. "2 unsaved fields" tells the reader they are about to lose
            something without telling them what, which is the question they actually have. */}
        <ul className="unsaved-list">
          {entries.map((entry) => (
            <li key={entry.key}>
              {entry.label} <span className="unsaved-activity">{entry.activityId}</span>
            </li>
          ))}
        </ul>
        <p>Leaving this lesson discards it. Nothing here has been stored.</p>
        <p className="unsaved-actions">
          <button type="button" className="unsaved-stay" onClick={stay}>
            Stay on this lesson
          </button>
          <button type="button" className="unsaved-leave" onClick={leave}>
            Leave anyway
          </button>
        </p>
      </div>
    </div>
  );
}
