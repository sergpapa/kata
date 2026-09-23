import type { LabKit } from './releaseTypes.js';

/**
 * The practice kit beside its lesson: which file, whose it is, and where it runs.
 *
 * It sits in the same place on every lesson — below the facts, above the body — rather than at the
 * point the prose first names it. Nine of the fourteen kit-bearing lessons never name it in their
 * body at all, and the reader needs the kit extracted and open *before* most of these lessons make
 * sense (docs/specs/lab-downloads.md, decision 1).
 *
 * The whole SHA-256 is printed, not a prefix: four handoffs ask the reader to compare it against
 * the registry, and a truncated hash cannot be compared.
 */

/** 39167 → "39,167". Grouped because a size is read, and six unbroken digits are not. */
function grouped(bytes: number): string {
  return bytes.toLocaleString('en-GB');
}

/** "6, 7 and 8" — the list a person would say out loud, not "6, 7, 8". */
function listed(numbers: readonly number[]): string {
  if (numbers.length <= 1) return numbers.join('');
  return `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

export function LabKitPanel({
  labKit,
  candidateLessonId,
}: {
  readonly labKit: LabKit | null;
  readonly candidateLessonId: string;
}) {
  if (!labKit) {
    // A sentence, not silence. An empty space is indistinguishable from a panel that failed to
    // load, and the lesson with no kit is lesson 1 — the first page anyone ever sees.
    return (
      <p className="lab-kit-none">
        This lesson needs no kit — there is nothing to download and nothing to install.
      </p>
    );
  }

  const others = labKit.lessons.filter((lesson) => lesson.candidateLessonId !== candidateLessonId);

  return (
    <section className="lab-kit" aria-label="Practice kit">
      <p className="lab-kit-eyebrow">Practice kit</p>
      <p className="lab-kit-file">{labKit.fileName}</p>
      <p className="lab-kit-identity">
        {labKit.labId} · version {labKit.version} · {grouped(labKit.byteSize)} bytes
      </p>
      {others.length > 0 && (
        <p className="lab-kit-shared">
          Shared with lessons {listed(labKit.lessons.map((lesson) => lesson.order))}. Keep the copy
          you already have — this is the same file.
        </p>
      )}
      <p className="lab-kit-hash-label">SHA-256, to check against the release registry</p>
      <p className="lab-kit-hash">{labKit.sha256}</p>
      <p className="lab-kit-actions">
        {/* A plain link, not a fetch: the browser's own download is the one thing on this page that
            already works without JavaScript, resumes, and lands in the folder the reader chose. */}
        <a
          className="lab-kit-download"
          href={`/api/labs/${encodeURIComponent(labKit.labId)}/download`}
        >
          Download kit
        </a>
      </p>
      <p className="lab-kit-note">
        The kit runs on your own computer, in your own terminal. This app never runs it, never
        installs it, and never changes a byte of it.
      </p>
    </section>
  );
}
