import { useSyncExternalStore } from 'react';

/**
 * What is typed and not yet acknowledged, and the one question the app asks before losing it.
 *
 * The app already never claims a save it did not make. This is the other half of the same promise:
 * it must not quietly eat the work either. A reader who typed a prediction and clicked Next did not
 * ask to throw it away, and "Not saved yet" written beside a box is not an answer once the box is
 * gone (docs/specs/acknowledged-saves.md, decision 4).
 *
 * The registry is module state rather than React state on purpose. Every response field on the page
 * writes to it, the dialog reads it, and `navigate()` consults it from outside React entirely.
 */

export interface UnsavedField {
  /** What the reader calls it — "Your prediction", not "prediction". */
  readonly label: string;
  readonly activityId: string;
}

export interface UnsavedEntry extends UnsavedField {
  readonly key: string;
}

const entries = new Map<string, UnsavedField>();
const listeners = new Set<() => void>();

/** Rebuilt only when the registry changes, because `useSyncExternalStore` compares by identity. */
let snapshot: readonly UnsavedEntry[] = [];

function publish(): void {
  snapshot = [...entries].map(([key, field]) => ({ key, ...field }));
  for (const listener of [...listeners]) listener();
}

/** Registers or clears one field. `null` clears; a field that unmounts must always clear. */
export function setUnsaved(key: string, field: UnsavedField | null): void {
  const had = entries.has(key);
  if (field === null) {
    if (!had) return;
    entries.delete(key);
  } else {
    const existing = entries.get(key);
    if (existing && existing.label === field.label && existing.activityId === field.activityId) {
      return;
    }
    entries.set(key, field);
  }
  publish();
}

export function unsavedEntries(): readonly UnsavedEntry[] {
  return snapshot;
}

export function hasUnsaved(): boolean {
  return entries.size > 0;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useUnsavedEntries(): readonly UnsavedEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}

/**
 * The navigation the guard is holding, if any. Module state for the same reason the registry is:
 * `navigate()` writes it from outside React, and the dialog reads it.
 */
let pending: string | null = null;
const pendingListeners = new Set<() => void>();

function publishPending(): void {
  for (const listener of [...pendingListeners]) listener();
}

export function holdNavigation(href: string): void {
  pending = href;
  publishPending();
}

export function pendingNavigation(): string | null {
  return pending;
}

export function releaseNavigation(): void {
  if (pending === null) return;
  pending = null;
  publishPending();
}

export function usePendingNavigation(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      pendingListeners.add(onChange);
      return () => pendingListeners.delete(onChange);
    },
    () => pending,
    () => pending,
  );
}
