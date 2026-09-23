import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { navigate, setNavigationGuard } from './route.js';
import {
  hasUnsaved,
  holdNavigation,
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
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  /** Where the reader was when the dialog took focus, so Stay can put them back. */
  const cameFrom = useRef<HTMLElement | null>(null);

  // The router asks; a veto holds the href for this dialog to act on.
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

  // The refresh and tab-close path. The listener is attached for as long as this dialog is mounted
  // and asks the registry at the moment the browser asks it, rather than being attached and
  // detached as the answer changes. Attaching a listener is not what makes a reload ask a question
  // — only `preventDefault()` is — and deciding at registration time means deciding from a
  // re-render that has not happened yet: a save that has just landed would still stop the refresh
  // after it.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent): void {
      if (!hasUnsaved()) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

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
    // Forced, because this *is* the guard's answer: the reader was asked and said go.
    if (target !== null) navigate(target, true);
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
