import type { LabKit } from './releaseTypes.js';

/**
 * The practice kit beside its lesson: which file, whose it is, and where it runs.
 *
 * It sits in the same place on every lesson — below the facts, above the body — rather than at the
 * point the prose first names it. Nine of the fourteen kit-bearing lessons never name it in their
 * body at all, and the reader needs the kit extracted and open *before* most of these lessons make
 * sense (docs/specs/lab-downloads.md, decision 1).
 *
 * Sitting there makes its height the lesson's problem: the facts list above it was collapsed into a
 * `<details>` precisely because it pushed Lesson 2's first sentence more than a screen and a half
 * down a phone, and the design review measured this panel doing the same thing. So only what a
 * reader acts on stays open — the filename, the download, who else shares it, and the one sentence
 * saying this app never runs it. The lab id, the version, the size and the 64-character SHA-256 are
 * reference material for checking a download against the registry, and they sit behind a
 * disclosure like the facts do.
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

export function LabKitPanel({ labKit }: { readonly labKit: LabKit | null }) {
  if (!labKit) {
    // A sentence, not silence. An empty space is indistinguishable from a panel that failed to
    // load, and the lesson with no kit is lesson 1 — the first page anyone ever sees. Set in full
    // ink for the reason `.lesson-status` is: it answers "where is my download?", and the answer to
    // a question a reader is actively looking for must not be the quietest thing on the page.
    return (
      <p className="lab-kit-none">
        This lesson needs no kit — there is nothing to download and nothing to install.
      </p>
    );
  }

  const shared = labKit.lessons.length > 1;

  return (
    <section className="lab-kit" aria-label="Practice kit">
      <p className="lab-kit-eyebrow">Practice kit</p>
      <p className="lab-kit-file">{labKit.fileName}</p>
      {shared && (
        // "Used by", not "Shared with": the list includes the lesson the reader is standing on, and
        // being told the kit is shared with the page you are on reads as a mistake.
        <p className="lab-kit-shared">
          Used by lessons {listed(labKit.lessons.map((lesson) => lesson.order))}. If you already
          extracted it for one of those, keep that copy — this is the same file.
        </p>
      )}
      <p className="lab-kit-actions">
        {/* A plain link, not a fetch: the browser's own download is the one thing on this page that
            already works without JavaScript, resumes, and lands in the folder the reader chose. The
            filename is in the accessible name because "Download kit" out of context does not say
            which kit, and a screen reader's link list is exactly that context. */}
        <a
          className="lab-kit-download"
          href={`/api/labs/${encodeURIComponent(labKit.labId)}/download`}
          aria-label={`Download kit ${labKit.fileName}`}
        >
          Download kit
        </a>
      </p>
      <p className="lab-kit-note">
        The kit runs on your own computer, in your own terminal. This app never runs it, never
        installs it, and never changes a byte of it.
      </p>
      <details className="lab-kit-detail">
        <summary>Version and checksum</summary>
        <p className="lab-kit-identity">
          {labKit.labId} · version {labKit.version} · {grouped(labKit.byteSize)} bytes
        </p>
        <p className="lab-kit-hash-label">SHA-256, to check against the release registry</p>
        <p className="lab-kit-hash">{labKit.sha256}</p>
      </details>
    </section>
  );
}
