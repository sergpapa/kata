/** The release numbers lessons 1–15; the design writes them 01–15 in the metadata register. */
export function twoDigits(order: number): string {
  return String(order).padStart(2, '0');
}

/**
 * When something was stored, in the reader's own locale.
 *
 * A clock time alone is right for a save just made and wrong for one made last week, and the same
 * line serves both: a field filled on first paint can carry any age at all, because rows outlive
 * the release they were written against. So anything that is not today says which day it was.
 *
 * Returns null for a timestamp that is not one, which is a fact worth keeping: the caller then says
 * nothing about when, rather than printing "Invalid Date" at the reader.
 */
export function storedWhen(iso: string, now = new Date()): string | null {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  const time = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay =
    when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() &&
    when.getDate() === now.getDate();
  if (sameDay) return `at ${time}`;
  const day = when.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `on ${day} at ${time}`;
}
