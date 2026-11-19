import { useEffect, useLayoutEffect, useState } from 'react';
import type { EarlierVersion, StoredResponse } from '../releaseTypes.js';
import { courseApi, useCourseId } from '../course.js';
import { setUnsaved } from '../unsavedGuard.js';
import { storedWhen } from '../format.js';
import { ConflictPanel } from './ConflictPanel.js';
import { RecoverActions } from './RecoverActions.js';
import { ResponseHistory } from './ResponseHistory.js';
import { fieldLabel } from './fieldLabels.js';
import type { LessonContext, RecoverySubject } from './recoveryFile.js';

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
  lessonContext,
  onTextChange,
}: {
  readonly activityId: string;
  readonly fieldName: string;
  /**
   * Told the box's text whenever it changes, saved or not: feedback is asked for on the boxes as
   * typed (docs/specs/practice-feedback.md PF1). Optional because a box stands on its own.
   */
  readonly onTextChange?: (fieldName: string, text: string) => void;
  /** What the server said was stored when this lesson answered. Absent means nothing is. */
  readonly stored?: StoredResponse | undefined;
  /** Which lesson this box belongs to, so a recovery file can say where the answer came from. */
  readonly lessonContext: LessonContext;
}) {
  // The course the lesson was read through: its release is the one a save is checked against and
  // stamped with, even when the lesson is shared (ADR 0018).
  const courseId = useCourseId();
  const label = fieldLabel(fieldName);
  // Unique without `useId`, and deliberately: an activity id appears once on a lesson page and a
  // field name once on an activity. `useId` spells its values with colons, which are legal in an
  // `id` but break any CSS selector built from one — including the one a label lookup uses.
  const boxId = `response-${activityId}-${fieldName}`;
  /** Every control and announcement names the activity too: a lesson carries three of each. */
  const scope = `${label}, ${activityId}`;

  const [text, setText] = useState(stored?.text ?? '');
  useEffect(() => {
    onTextChange?.(fieldName, text);
  }, [onTextChange, fieldName, text]);
  /** The text and revision the server last acknowledged. The whole state machine hangs off this. */
  const [acknowledged, setAcknowledged] = useState({
    text: stored?.text ?? '',
    revision: stored?.revision ?? 0,
    at: stored?.updatedAt ?? null,
  });
  /**
   * The revisions this field has superseded, as the server last described them (ADR 0012).
   *
   * Held rather than derived, and replaced only by an answer that carries the key: the page never
   * assembles a history from what it remembers sending, because a second tab's writes are part of
   * this list and the page has never seen them.
   */
  const [earlierVersions, setEarlierVersions] = useState<readonly EarlierVersion[]>(
    stored?.earlierVersions ?? [],
  );
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
  //
  // A layout effect, not a passive one, because of *who reads this*. Three synchronous handlers do:
  // the link veto in `navigate()`, the `popstate` handler, and `beforeunload`. Any of them can fire
  // in the very next task after a commit, so the registry has to agree with the DOM that commit
  // produced rather than trail it by a scheduler tick. Written passively, a field that has just
  // rendered itself `saved` is still registered as unsaved for one task, and a click or a refresh
  // arriving inside that task is refused over work that is safe.
  const guardKey = `${activityId}/${fieldName}`;
  const unsaved = !matchesAcknowledged;
  useLayoutEffect(() => {
    setUnsaved(guardKey, unsaved ? { label, activityId } : null);
  }, [guardKey, unsaved, label, activityId]);
  useLayoutEffect(() => () => setUnsaved(guardKey, null), [guardKey]);

  /** One save attempt against a revision the caller names. Returns nothing; it sets the state. */
  async function send(body: string, expectedRevision: number): Promise<void> {
    setInFlight(true);
    setFailure(null);
    try {
      // Encoded, because an activity id and a field name are both content: nothing in the release
      // format promises either is free of a `/` or a space. The same reason `lessonHref` encodes.
      const url = `${courseApi(courseId)}/activities/${encodeURIComponent(activityId)}/responses/${encodeURIComponent(fieldName)}`;
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
        earlierVersions?: readonly EarlierVersion[];
      };

      // Sent with both the acceptance and the refusal, so the list follows the store either way.
      // An answer that omits the key is not an answer of "none": clearing the list there would
      // hide revisions that exist, which is the same class of lie as inventing one.
      if (answer.earlierVersions) setEarlierVersions(answer.earlierVersions);

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

  /**
   * This answer as it stands right now, for whichever way out the reader takes.
   *
   * Rebuilt on every render rather than memoised, and deliberately: the box is a controlled input,
   * so a render is exactly what a keystroke causes, and the press-time text is the whole claim of
   * criteria F7 and C1. Memoising it here would be the defect those criteria were written to catch.
   */
  const subject: RecoverySubject = {
    lesson: lessonContext,
    activityId,
    fieldName,
    label,
    text,
  };

  return (
    <div className="response-field" data-field-name={fieldName} data-state={state}>
      <div className="response-head">
        <label htmlFor={boxId}>{label}</label>
        {/* Polite, and it names its own field and activity: a lesson page carries three regions
            that would otherwise announce the identical words. */}
        <p className="response-state" role="status">
          <span className="visually-hidden">{scope}: </span>
          {stateWords(state, acknowledged.at ? storedWhen(acknowledged.at) : null)}
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
          mine={subject}
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

          {/* Only here, and only in this state (decision 6). A box in the plain unsaved state has
              Save an inch away and pressing it is the recovery; two more controls under all twelve
              boxes is height on a page where nothing has gone wrong. */}
          {state === 'failed' && (
            <RecoverActions subject={subject} scope={scope} offerDownload={true} />
          )}
        </p>
      )}

      {/* Below the Save it belongs to, not between the box and its own control: what the owner
          wrote before is context for the box, and it must not come between somebody and the button
          that stores what they just typed. */}
      <ResponseHistory
        earlierVersions={earlierVersions}
        label={label}
        activityId={activityId}
        fieldName={fieldName}
        lessonContext={lessonContext}
      />
    </div>
  );
}
