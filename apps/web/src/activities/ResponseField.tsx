import { useEffect, useState } from 'react';
import type { StoredResponse } from '../releaseTypes.js';
import { setUnsaved } from '../unsavedGuard.js';

/**
 * One recorded field: a box, a state the server decides, and a save the reader asks for.
 *
 * The rule the whole component is built around: **`saved` means the text in the box is
 * character-for-character what the server acknowledged**. It is derived from that comparison, never
 * from "the reader pressed Save", because those two come apart the moment somebody types again —
 * and a page that still says Saved there is telling the reader their edit is safe when it is not.
 *
 * There is no autosave and no debounce. ADR 0004 rejects optimistic local-first because it claims a
 * state the write has not earned; a timer is the same claim with a shorter fuse.
 */

export type FieldState = 'unsaved' | 'saving' | 'saved' | 'failed' | 'conflict';

/** The `response_fields` this app has words for. An unknown one is shown as the author wrote it. */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  prediction: 'Your prediction',
  observation: 'What you observed',
  explanation: 'Your explanation',
  help_used: 'Whether you used help',
};

export function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

/**
 * What the reader is told, per state.
 *
 * The failed and conflict lines state what happened rather than negating what did not. "Not
 * stored" and "Not saved" are both true there, but a reader skimming a column of twelve states
 * reads the word before they read the "not" — and the two states where that misreading is
 * expensive are exactly these two.
 */
function stateWords(state: FieldState, savedAt: string | null): string {
  switch (state) {
    case 'saved':
      return savedAt ? `Saved at ${savedAt}` : 'Saved';
    case 'saving':
      return 'Saving…';
    case 'failed':
      return 'The save did not go through';
    case 'conflict':
      return 'This field changed somewhere else';
    default:
      return 'Not saved yet';
  }
}

/** Local clock time, because a reader checking "did that land?" is asking about the last minute. */
function atTime(iso: string): string | null {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

interface ConflictRecord {
  readonly text: string;
  readonly revision: number;
  readonly updatedAt: string;
}

export function ResponseField({
  activityId,
  fieldName,
  stored,
}: {
  readonly activityId: string;
  readonly fieldName: string;
  /** What the server said was stored when this lesson answered. Absent means nothing is. */
  readonly stored?: StoredResponse | undefined;
}) {
  const label = fieldLabel(fieldName);
  // Unique without `useId`, and deliberately: an activity id appears once on a lesson page and a
  // field name once on an activity. `useId` spells its values with colons, which are legal in an
  // `id` but break any CSS selector built from one — including the one a label lookup uses.
  const boxId = `response-${activityId}-${fieldName}`;

  const [text, setText] = useState(stored?.text ?? '');
  /** The text and revision the server last acknowledged. The whole state machine hangs off this. */
  const [acknowledged, setAcknowledged] = useState({
    text: stored?.text ?? '',
    revision: stored?.revision ?? 0,
    at: stored?.updatedAt ?? null,
  });
  const [inFlight, setInFlight] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictRecord | null>(null);

  const matchesAcknowledged = text === acknowledged.text;
  const savedSomething = acknowledged.at !== null;

  const state: FieldState = inFlight
    ? 'saving'
    : conflict
      ? 'conflict'
      : failure
        ? 'failed'
        : matchesAcknowledged && savedSomething
          ? 'saved'
          : 'unsaved';

  // What the navigation guard is holding. Registered by key so the dialog can name it, and cleared
  // on unmount — a registry the last caller forgot to leave would block every later navigation.
  const guardKey = `${activityId}/${fieldName}`;
  const unsaved = !matchesAcknowledged;
  useEffect(() => {
    setUnsaved(guardKey, unsaved ? { label, activityId } : null);
  }, [guardKey, unsaved, label, activityId]);
  useEffect(() => () => setUnsaved(guardKey, null), [guardKey]);

  /** One save attempt against a revision the caller names. Returns nothing; it sets the state. */
  async function send(body: string, expectedRevision: number): Promise<void> {
    setInFlight(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/activities/${activityId}/responses/${fieldName}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: body, expectedRevision }),
      });
      const answer = (await response.json()) as {
        state?: string;
        revision?: number;
        updatedAt?: string;
        error?: string;
        message?: string;
        stored?: { text: string; revision: number; updatedAt: string } | null;
      };

      if (response.status === 409 && answer.error === 'revision_conflict') {
        // Not a failure the reader can retry past: retrying is the one thing that must not
        // silently work here. Both texts stay on screen until they choose.
        setConflict({
          text: answer.stored?.text ?? '',
          revision: answer.stored?.revision ?? 0,
          updatedAt: answer.stored?.updatedAt ?? new Date().toISOString(),
        });
        return;
      }
      if (!response.ok || answer.state !== 'saved' || typeof answer.revision !== 'number') {
        setFailure(answer.message ?? `The app answered with status ${response.status}.`);
        return;
      }

      setConflict(null);
      setAcknowledged({
        text: body,
        revision: answer.revision,
        at: answer.updatedAt ?? new Date().toISOString(),
      });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'The app did not answer.');
    } finally {
      setInFlight(false);
    }
  }

  function save(): void {
    if (inFlight) return;
    void send(text, conflict ? conflict.revision : acknowledged.revision);
  }

  /** Take what is stored, at the revision it is stored at. No request: nothing has changed. */
  function useStored(): void {
    if (!conflict) return;
    setText(conflict.text);
    // The stored record's own time, not now: the reader did not save this, they accepted it, and
    // the page must not claim a save that never happened at this clock.
    setAcknowledged({ text: conflict.text, revision: conflict.revision, at: conflict.updatedAt });
    setConflict(null);
    setFailure(null);
  }

  const savedAt = acknowledged.at ? atTime(acknowledged.at) : null;

  return (
    <div className="response-field" data-field-name={fieldName} data-state={state}>
      <div className="response-head">
        <label htmlFor={boxId}>{label}</label>
        {/* Polite, and it names its own field: twelve regions on a lesson page announcing a bare
            "Saved" would say nothing about which box just landed. */}
        <p className="response-state" role="status">
          <span className="visually-hidden">{label}: </span>
          {stateWords(state, savedAt)}
        </p>
      </div>

      <textarea
        id={boxId}
        className="response-box"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      {state === 'failed' && failure && (
        <p className="response-failure">
          {failure} Your text is still here, and you can try again.
        </p>
      )}

      {conflict && (
        <ConflictPanel stored={conflict.text} onUseStored={useStored} onKeepMine={save} />
      )}

      {!conflict && (
        <p className="response-actions">
          {/* Named from the author's own field token rather than from the label. Twelve buttons
              reading "Save" are twelve identical entries in a screen reader's control list, and
              repeating the label instead would give the box and its button the same name. */}
          <button
            type="button"
            className="response-save"
            onClick={save}
            aria-label={`Save ${fieldName.replace(/_/g, ' ')}`}
          >
            {inFlight ? 'Saving…' : 'Save'}
          </button>
        </p>
      )}
    </div>
  );
}

/**
 * Both texts, side by side, and the reader decides. Keep mine re-sends against the revision the
 * conflict reported — a deliberate overwrite they asked for, which is not the silent one ADR 0004
 * forbids. Nothing here discards either text on its own.
 */
function ConflictPanel({
  stored,
  onUseStored,
  onKeepMine,
}: {
  readonly stored: string;
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
      <pre className="response-conflict-stored">{stored}</pre>

      <p className="response-conflict-label">What you typed here, still in the box above</p>

      <p className="response-actions">
        <button type="button" className="response-save" onClick={onKeepMine}>
          Keep mine
        </button>
        <button type="button" className="response-secondary" onClick={onUseStored}>
          Use stored
        </button>
      </p>
    </div>
  );
}
