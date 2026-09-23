import { useCopyToClipboard } from '../clipboard.js';
import { useFileDownload } from '../download.js';
import { recoveryDocument, recoveryFileName, type RecoverySubject } from './recoveryFile.js';

/**
 * The way out of a box the app could not store: take the characters, or take a file.
 *
 * ADR 0004 promised the learner's text "still present **and recoverable**" in the failed state.
 * Slice 10 built present — the text stays in the box and the failure is named. This is recoverable,
 * and it answers the handoff's acceptance row "Simulate a save failure | Existing acknowledged work
 * remains intact; the learner can recover or export the unsaved text".
 *
 * **Copy takes the characters alone; Download takes them with their provenance.** That asymmetry is
 * deliberate (docs/specs/save-failure-recovery.md, decision 4): a copy exists to be pasted straight
 * back into a box or a notes app, where a header would be in the way, and a file exists to be found
 * again a week later, where four unlabelled lines cannot be placed back against a lesson.
 *
 * Shown in two places, and by decision 6 in no others: under a refused save, and inside the
 * conflict panel, where Use stored is the one control in this app that destroys typed work. A box
 * in the plain unsaved state has Save an inch away and pressing it is the recovery.
 */

/** What the file is. `charset` stated because the answer is the reader's, not this app's ASCII. */
const MARKDOWN = 'text/markdown;charset=utf-8';

export function RecoverActions({
  subject,
  scope,
  offerDownload,
}: {
  /**
   * The answer as it stands **now**. Held as a plain prop and never memoised: the box is a
   * controlled input, so this component re-renders on every keystroke and what a press sees is what
   * the reader can see. A value captured when the failure arrived would hand back the older text —
   * the defect criteria F7 and C1 exist to catch.
   */
  readonly subject: RecoverySubject;
  /** "Your prediction, ACT-M020-04-02". A lesson carries twelve of these; a bare Copy names none. */
  readonly scope: string;
  /**
   * Required rather than defaulted, because the two callers genuinely differ and a default would
   * quietly pick for a third. An earlier version is offered no download: that text is on the server
   * already and is the one text on the page that cannot be lost (decision 5).
   */
  readonly offerDownload: boolean;
}) {
  const clipboard = useCopyToClipboard();
  const file = useFileDownload();

  const copyWord =
    clipboard.state === 'copied'
      ? 'Copied'
      : clipboard.state === 'failed'
        ? 'Could not copy'
        : 'Copy';
  const fileWord =
    file.state === 'downloaded'
      ? 'Downloaded'
      : file.state === 'failed'
        ? 'Could not download'
        : 'Download';

  return (
    <>
      <button
        // Explicit, because a button inside anything that becomes a form defaults to submit.
        type="button"
        className="response-recover"
        data-state={clipboard.state}
        aria-label={`${copyWord} ${scope}`}
        onClick={() => clipboard.copy(subject.text)}
      >
        {copyWord}
      </button>
      {/* Rendered only while there is something to say. The app's own convention: whether a screen
          reader re-announces a focused button's own label when that label changes varies by reader,
          and "Copied" against "Could not copy" is the whole feedback there is. */}
      {clipboard.state !== 'idle' && (
        <span className="visually-hidden" role="status">{`${copyWord} ${scope}`}</span>
      )}

      {offerDownload && (
        <>
          <button
            type="button"
            className="response-recover"
            data-state={file.state}
            aria-label={`${fileWord} ${scope}`}
            // Built at the press, not at render: twelve fields a lesson would otherwise each build
            // a document and a file name on every keystroke, and the time stamped inside the file
            // would be the time the box was drawn rather than the time the reader took it away.
            onClick={() =>
              file.download(
                recoveryFileName(subject),
                recoveryDocument(subject, new Date()),
                MARKDOWN,
              )
            }
          >
            {fileWord}
          </button>
          {file.state !== 'idle' && (
            <span className="visually-hidden" role="status">{`${fileWord} ${scope}`}</span>
          )}
        </>
      )}
    </>
  );
}
