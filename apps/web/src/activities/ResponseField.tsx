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

function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

/**
 * What the reader is told, per state.
 *
 * The failed and conflict lines state what happened rather than negating what did not. "Not stored"
 * and "Not saved" are both true there, but a reader skimming a column of twelve states reads the
 * word before they read the "not" — and these are the two states where that misreading is
 * expensive.
 */
function stateWords(state: FieldState, savedAt: string | null): string {
  switch (state) {
    case 'saved':
      return savedAt ? `Saved ${savedAt}` : 'Saved';
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

/**
 * When the acknowledged text was stored, in the reader's own locale.
 *
 * A clock time alone is right for a save just made and wrong for one made last week, and the same
 * line serves both: a field filled on first paint can carry any age at all, because rows outlive
 * the release they were written against. So anything that is not today says which day it was.
 */
function savedWhen(iso: string, now = new Date()): string | null {
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

/**
 * What the server holds for this field, as a refusal reported it.
 *
 * `text` is null when the server said it holds **nothing** — a different fact from holding an empty
 * answer, and the one place this component could most easily invent a save that never happened.
 */
interface ConflictRecord {
  readonly text: string | null;
  readonly revision: number;
  readonly updatedAt: string | null;
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
  /** Every control and announcement names the activity too: a lesson carries three of each. */
  const scope = `${label}, ${activityId}`;

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

  // A failure outranks an open conflict. A save made from the conflict panel can fail like any
  // other, and while `conflict` won this the page did not change at all when it did: the reader
  // pressed Keep mine, the request left, nothing came back, and nothing on screen said so.
  const state: FieldState = inFlight
    ? 'saving'
    : failure
      ? 'failed'
      : conflict
        ? 'conflict'
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
      // Encoded, because an activity id and a field name are both content: nothing in the release
      // format promises either is free of a `/` or a space. The same reason `lessonHref` encodes.
      const url = `/api/activities/${encodeURIComponent(activityId)}/responses/${encodeURIComponent(fieldName)}`;
      const response = await fetch(url, {
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
        failure?: { message?: string };
        stored?: { text: string; revision: number; updatedAt: string } | null;
      };

      if (response.status === 409 && answer.error === 'revision_conflict') {
        // Not a failure the reader can retry past: retrying is the one thing that must not
        // silently work here. Both texts stay on screen until they choose.
        //
        // `stored: null` is an answer, not a missing one — the server is saying it holds nothing
        // for this field. Filling that gap with an empty string, revision 0 and a timestamp of our
        // own would let Use stored hand the reader a "Saved" for a record that does not exist.
        // Found twice over in review, by `/code-review` and by test-guardian POST independently.
        setConflict(
          answer.stored
            ? {
                text: answer.stored.text,
                revision: answer.stored.revision,
                updatedAt: answer.stored.updatedAt,
              }
            : { text: null, revision: 0, updatedAt: null },
        );
        return;
      }
      if (!response.ok || answer.state !== 'saved' || typeof answer.revision !== 'number') {
        // A refused release answers 200 with the importer's own words under `failure`, which is
        // the shape every other endpoint uses. Reading only `message` finds nothing there, and
        // tells the reader the app answered with status 200 — true, and useless.
        setFailure(
          answer.failure?.message ??
            answer.message ??
            `The app answered with status ${response.status}.`,
        );
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
    setConflict(null);
    setFailure(null);
    setText(conflict.text ?? '');
    setAcknowledged({
      text: conflict.text ?? '',
      revision: conflict.revision,
      // The stored record's own time, never now: the reader did not save this, they accepted it.
      // And null where the server holds nothing, which leaves the field unsaved rather than
      // claiming a save for a record that is not there.
      at: conflict.updatedAt,
    });
  }

  return (
    <div className="response-field" data-field-name={fieldName} data-state={state}>
      <div className="response-head">
        <label htmlFor={boxId}>{label}</label>
        {/* Polite, and it names its own field and activity: a lesson page carries three regions
            that would otherwise announce the identical words. */}
        <p className="response-state" role="status">
          <span className="visually-hidden">{scope}: </span>
          {stateWords(state, acknowledged.at ? savedWhen(acknowledged.at) : null)}
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
        <ConflictPanel
          stored={conflict.text}
          scope={scope}
          onUseStored={useStored}
          onKeepMine={save}
        />
      )}

      {!conflict && (
        <p className="response-actions">
          <button
            type="button"
            className="response-save"
            // Filled only while there is a write waiting to happen. Twelve solid buttons on a
            // lesson are louder than the lesson's own actions, and a field with nothing to save
            // has no business looking urgent.
            data-pending={matchesAcknowledged ? 'false' : 'true'}
            onClick={save}
            // Focusable on purpose while saving: `disabled` would drop the focus of whoever just
            // pressed it. `aria-disabled` says the same thing without moving anybody.
            aria-disabled={inFlight}
            aria-label={`Save ${fieldName.replace(/_/g, ' ')}, ${activityId}`}
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
 *
 * The two actions carry equal weight. Decision 3 treats them as two legitimate choices, and making
 * the overwrite the confident-looking one would be the app leaning on a decision that is the
 * reader's to make.
 */
function ConflictPanel({
  stored,
  scope,
  onUseStored,
  onKeepMine,
}: {
  /** null when the server reported holding nothing at all for this field. */
  readonly stored: string | null;
  readonly scope: string;
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
