/** The release numbers lessons 1–15; the design writes them 01–15 in the metadata register. */
export function twoDigits(order: number): string {
  return String(order).padStart(2, '0');
}
