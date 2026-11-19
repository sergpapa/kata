import { useState, type ReactNode } from 'react';
import { courseApi, useCourseId } from '../course.js';
import { FeedbackTurns } from './FeedbackTurns.js';
import { useFeedbackConversation } from './useFeedbackConversation.js';
import {
  FEEDBACK_MODEL_STORAGE_KEY,
  FEEDBACK_MODELS,
  type FeedbackArea as Area,
  type FeedbackAvailability,
  type FeedbackModel,
} from './feedbackTypes.js';

/**
 * Claude's feedback on one activity (docs/specs/practice-feedback.md, ADR 0019).
 *
 * Optional by construction: nothing here is read by navigation, progress or the boxes, and the
 * boxes are never written from here. It sits quiet until asked — a small title, one note, one
 * button — because it repeats on every activity of every lesson. The conversation logic lives in
 * `useFeedbackConversation`; this file draws it.
 */

const NOTE = 'Claude can be wrong. This is feedback on your reasoning, not a grade.';
const NO_WORKED_ANSWER =
  'This activity has no worked answer from the author, so Claude’s feedback is its own reading.';

function rememberedModel(): FeedbackModel {
  try {
    const stored = window.localStorage.getItem(FEEDBACK_MODEL_STORAGE_KEY);
    return FEEDBACK_MODELS.find((model) => model.value === stored)?.value ?? 'sonnet';
  } catch {
    return 'sonnet';
  }
}

function remember(model: FeedbackModel): void {
  try {
    window.localStorage.setItem(FEEDBACK_MODEL_STORAGE_KEY, model);
  } catch {
    // Storage is a convenience here; the choice still holds for this page.
  }
}

/** "15:00 on 19 November", in the reader's own time zone (PF20). */
export function resumesAtWords(iso: string): string {
  const when = new Date(iso);
  const time = when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${time} on ${day}`;
}

function ModelPicker({
  model,
  onChange,
}: {
  readonly model: FeedbackModel;
  readonly onChange: (model: FeedbackModel) => void;
}) {
  return (
    <label className="feedback-model">
      Model
      <select value={model} onChange={(event) => onChange(event.target.value as FeedbackModel)}>
        {FEEDBACK_MODELS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FeedbackArea({
  activityId,
  fieldNames,
  drafts,
  area,
  availability: loadedAvailability,
}: {
  readonly activityId: string;
  /** The activity's declared boxes, in order. */
  readonly fieldNames: readonly string[];
  /** Each box's text as typed, saved or not. */
  readonly drafts: Readonly<Record<string, string>>;
  readonly area: Area;
  readonly availability: FeedbackAvailability;
}) {
  const url = `${courseApi(useCourseId())}/activities/${encodeURIComponent(activityId)}/feedback`;
  const talk = useFeedbackConversation(url, area, loadedAvailability);
  const { conversation, availability, busy, writing, replyingElsewhere, pending } = talk;
  const [message, setMessage] = useState('');
  const [model, setModel] = useState<FeedbackModel>(rememberedModel);
  const choose = (chosen: FeedbackModel) => {
    setModel(chosen);
    remember(chosen);
  };

  const turns = conversation?.turns ?? [];
  const typed = fieldNames.map((fieldName) => ({ fieldName, text: drafts[fieldName] ?? '' }));
  const nothingTyped = typed.every((field) => field.text.trim() === '');
  // The first question went unanswered: its reply failed, or never came. Try again resends it.
  const firstUnanswered =
    (turns.length === 1 && turns[0]?.role === 'learner') ||
    (turns.length === 2 && turns[1]?.outcome === 'failed');
  const sentFirst = turns[0]?.sentFields;
  const titleId = `feedback-title-${activityId}`;

  const startOverButton = !busy && (
    <button type="button" className="feedback-text-button" onClick={() => void talk.startOver()}>
      Start over
    </button>
  );

  let controls: ReactNode;
  if (availability.state === 'unavailable') {
    controls = <p className="feedback-held">{availability.reason}</p>;
  } else if (availability.state === 'paused') {
    controls = (
      <p className="feedback-held">
        {availability.reason} It starts again at {resumesAtWords(availability.resumesAt)}.
      </p>
    );
  } else if (conversation === null || pending === 'start') {
    // Kept on screen through the first reply, disabled, so it cannot be pressed twice.
    controls = !replyingElsewhere && (
      <>
        <div className="feedback-actions">
          <button
            type="button"
            className="response-save"
            disabled={busy || nothingTyped}
            onClick={() => void talk.ask(model, typed)}
          >
            Get feedback
          </button>
          <ModelPicker model={model} onChange={choose} />
        </div>
        {nothingTyped && !busy && (
          <p className="feedback-hint">Write in at least one box above first.</p>
        )}
      </>
    );
  } else if (firstUnanswered && sentFirst) {
    controls = !busy && (
      <div className="feedback-actions">
        <button
          type="button"
          className="response-save"
          onClick={() => void talk.tryAgain(model, sentFirst)}
        >
          Try again
        </button>
        <ModelPicker model={model} onChange={choose} />
        {startOverButton}
      </div>
    );
  } else {
    // One composer for the whole conversation, so the box and its text survive a send.
    controls = (
      <div className="feedback-composer">
        <textarea
          className="response-box feedback-message"
          aria-label="Message to Claude"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
        />
        <div className="feedback-actions">
          <button
            type="button"
            className="response-save"
            disabled={busy || message.trim() === ''}
            onClick={() => void talk.send(model, message, () => setMessage(''))}
          >
            Send
          </button>
          <ModelPicker model={model} onChange={choose} />
          {startOverButton}
        </div>
      </div>
    );
  }

  return (
    <section className="feedback-area" aria-labelledby={titleId}>
      <p id={titleId} className="feedback-title">
        Feedback from Claude
      </p>
      <p className="feedback-note">
        <span>{NOTE}</span>
        {!area.hasWorkedAnswer && (
          <>
            {' '}
            <span>{NO_WORKED_ANSWER}</span>
          </>
        )}
      </p>

      {(turns.length > 0 || writing !== null) && <FeedbackTurns turns={turns} writing={writing} />}
      {replyingElsewhere && writing === null && (
        <p className="feedback-status">Claude is still replying…</p>
      )}
      {/* Always present, so a change of text is announced: a live region inserted already filled
          is often not read at all, and the streamed text itself would re-read on every piece. */}
      <p className="visually-hidden" role="status">
        {writing !== null || replyingElsewhere ? 'Claude is writing a reply.' : ''}
      </p>
      {talk.notice && (
        <p className="feedback-notice" role="alert">
          {talk.notice}
        </p>
      )}

      {controls}
    </section>
  );
}
