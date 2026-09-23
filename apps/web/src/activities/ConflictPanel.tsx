/**
 * The conflict path: both texts on screen, and the reader decides which survives.
 *
 * Its own file since slice 12, when ResponseField.tsx passed the size guidance with this still in
 * it. Nothing about it changed in the move; the tests already on it are what prove that.
 */

import { RecoverActions } from './RecoverActions.js';
import type { RecoverySubject } from './recoveryFile.js';

/**
 * Both texts, side by side, and the reader decides. Keep mine re-sends against the revision the
 * conflict reported — a deliberate overwrite they asked for, which is not the silent one ADR 0004
 * forbids. Nothing here discards either text on its own.
 *
 * The two actions carry equal weight. Decision 3 treats them as two legitimate choices, and making
 * the overwrite the confident-looking one would be the app leaning on a decision that is the
 * reader's to make.
 */
export function ConflictPanel({
  stored,
  scope,
  mine,
  onUseStored,
  onKeepMine,
}: {
  /** null when the server reported holding nothing at all for this field. */
  readonly stored: string | null;
  readonly scope: string;
  /**
   * The reader's own answer, as the box holds it now — not the stored text shown above it.
   *
   * Use stored is the one control in this app that destroys typed work, and until slice 13 it was
   * the only thing on offer beside it. Passed live rather than captured when the conflict arrived,
   * because the box stays editable through this panel and reading the stored text is exactly what
   * makes somebody improve their own (criterion C1).
   */
  readonly mine: RecoverySubject;
  readonly onUseStored: () => void;
  readonly onKeepMine: () => void;
}) {
  return (
    <div className="response-conflict" role="alert">
      <p className="response-conflict-lead">
        This field was saved somewhere else since you started editing it. Nothing has been
        overwritten — choose which text to keep.
      </p>

      <p className="response-conflict-label">Saved elsewhere</p>
      {stored === null ? (
        <p className="response-conflict-empty">
          Nothing is stored for this field now. Taking it would leave the box empty and unsaved.
        </p>
      ) : (
        <pre className="response-conflict-stored">{stored}</pre>
      )}

      <p className="response-conflict-label">What you typed here, still in the box above</p>

      {/* Above the choice, not below it: one of the two buttons underneath replaces the box, and a
          way to keep what it replaces has to be visible before the press, not after it. */}
      <p className="response-actions">
        <RecoverActions subject={mine} scope={scope} offerDownload={true} />
      </p>

      <p className="response-actions">
        <button
          type="button"
          className="response-secondary"
          onClick={onKeepMine}
          aria-label={`Keep mine, ${scope}`}
        >
          Keep mine
        </button>
        <button
          type="button"
          className="response-secondary"
          onClick={onUseStored}
          aria-label={`Use stored, ${scope}`}
        >
          Use stored
        </button>
      </p>
    </div>
  );
}
