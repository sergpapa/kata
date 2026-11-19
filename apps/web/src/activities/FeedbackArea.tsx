import { useEffect, useState } from 'react';
import { courseApi, useCourseId } from '../course.js';
import { FeedbackTurns } from './FeedbackTurns.js';
import { postFeedback } from './feedbackStream.js';
import {
  FEEDBACK_MODEL_STORAGE_KEY,
  FEEDBACK_MODELS,
  type FeedbackArea as Area,
  type FeedbackAvailability,
  type FeedbackConversation,
  type FeedbackModel,
  type FeedbackTurn,
  type SentField,
} from './feedbackTypes.js';

/**
 * Claude's feedback on one activity (docs/specs/practice-feedback.md, ADR 0019).
 *
 * Optional by construction: nothing here is read by navigation, progress or the boxes, and the
 * boxes are never written from here. The conversation shown is always one the server stored or
 * streamed; on any refusal that names the current conversation, the page redraws from it.
 */

/** How often a page opened mid-reply asks whether the reply has arrived (PF15). */
const POLL_MS = 3_000;

const NOTE = 'Claude can be wrong. This is feedback on your reasoning, not a grade.';
const NO_WORKED_ANSWER =
  'This activity has no worked answer from the author, so Claude’s feedback is its own reading.';

function rememberedModel(): FeedbackModel {
  try {
    const stored = window.localStorage.getItem(FEEDBACK_MODEL_STORAGE_KEY);
    const known = FEEDBACK_MODELS.find((model) => model.value === stored);
    return known ? known.value : 'sonnet';
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
  const [conversation, setConversation] = useState<FeedbackConversation | null>(area.conversation);
  const [availability, setAvailability] = useState(loadedAvailability);
  /** A run this page did not start, or lost the stream of: the page asks until it ends. */
  const [replyingElsewhere, setReplyingElsewhere] = useState(area.replying);
  /** Claude's text so far on a run this page is streaming; null when none is. */
  const [writing, setWriting] = useState<string | null>(null);
  /** What this page is waiting on: a start, a follow-up or a Start over. */
  const [pending, setPending] = useState<'start' | 'follow_up' | 'clear' | null>(null);
  /** Moves on every poll answer that says "still replying", so the next poll is scheduled. */
  const [polls, setPolls] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [model, setModel] = useState<FeedbackModel>(rememberedModel);

  useEffect(() => {
    if (!replyingElsewhere || pending) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(url);
        const body = (await response.json()) as Area & { availability: FeedbackAvailability };
        setConversation(body.conversation);
        setAvailability(body.availability);
        setReplyingElsewhere(body.replying);
      } catch {
        // Asked again on the next tick: the reply is stored at the server either way.
      }
      setPolls((count) => count + 1);
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [replyingElsewhere, pending, url, polls]);

  const busy = pending !== null || replyingElsewhere;

  function onEvent(event: string, data: unknown) {
    const payload = data as { conversationId?: number; turn?: FeedbackTurn; text?: string };
    if (event === 'delta' && typeof payload.text === 'string') {
      const piece = payload.text;
      setWriting((sofar) => (sofar ?? '') + piece);
      return;
    }
    if (
      (event === 'learner' || event === 'reply') &&
      payload.turn &&
      typeof payload.conversationId === 'number'
    ) {
      const { conversationId, turn } = payload as { conversationId: number; turn: FeedbackTurn };
      setConversation((shown) =>
        shown && shown.conversationId === conversationId
          ? {
              conversationId,
              turns: [...shown.turns.filter((one) => one.turn !== turn.turn), turn],
            }
          : { conversationId, turns: [turn] },
      );
      if (event === 'learner') setWriting('');
      if (event === 'reply') setWriting(null);
    }
  }

  function onRefusal(status: number, body: Record<string, unknown>): void {
    if (body.error === 'feedback_conversation_changed') {
      setConversation((body.conversation as FeedbackConversation | null) ?? null);
    } else if (body.error === 'feedback_usage_paused' && typeof body.resumesAt === 'string') {
      setAvailability({
        state: 'paused',
        reason: String(body.message ?? ''),
        resumesAt: body.resumesAt,
      });
    } else if (body.error === 'feedback_unavailable') {
      setAvailability({ state: 'unavailable', reason: String(body.message ?? '') });
    } else {
      setNotice(
        typeof body.message === 'string' ? body.message : `The app answered with status ${status}.`,
      );
    }
  }

  async function run(
    body: { readonly action: 'start' | 'follow_up'; readonly [key: string]: unknown },
    after?: () => void,
  ): Promise<void> {
    setPending(body.action);
    setNotice(null);
    let replied = false;
    const outcome = await postFeedback(url, body, (event, data) => {
      if (event === 'reply') replied = true;
      onEvent(event, data);
    });
    setPending(null);
    if (outcome.kind === 'unreachable') {
      setWriting(null);
      if (replied) return;
      setNotice(`The local app did not answer: ${outcome.reason}`);
      return;
    }
    if (outcome.kind === 'answered') {
      onRefusal(outcome.status, outcome.body);
      return;
    }
    if (!replied) {
      // The stream closed early; the run goes on at the server, so ask for it there.
      setWriting(null);
      setReplyingElsewhere(true);
      return;
    }
    after?.();
  }

  const ask = (fields: readonly SentField[]) =>
    run({
      action: 'start',
      model,
      fields: Object.fromEntries(fields.map((field) => [field.fieldName, field.text])),
    });

  async function startOver(): Promise<boolean> {
    if (!conversation) return true;
    setPending('clear');
    setNotice(null);
    const outcome = await postFeedback(
      `${url}/clear`,
      { conversationId: conversation.conversationId },
      () => {},
    );
    setPending(null);
    if (outcome.kind === 'answered' && outcome.status === 200) {
      setConversation(null);
      return true;
    }
    if (outcome.kind === 'answered') onRefusal(outcome.status, outcome.body);
    else if (outcome.kind === 'unreachable')
      setNotice(`The local app did not answer: ${outcome.reason}`);
    return false;
  }

  /** Starts over, then resends what the failed first turn sent (PF17). */
  async function tryAgain(sent: readonly SentField[]): Promise<void> {
    if (await startOver()) await ask(sent);
  }

  const turns = conversation?.turns ?? [];
  const firstReply = turns[1];
  const firstFailed =
    turns.length === 2 && firstReply?.role === 'claude' && firstReply.outcome === 'failed';
  const sentFirst = turns[0]?.sentFields;
  const typed = fieldNames.map((fieldName) => ({ fieldName, text: drafts[fieldName] ?? '' }));
  const nothingTyped = typed.every((field) => field.text.trim() === '');

  return (
    <section className="feedback-area" aria-label="Feedback from Claude">
      <div className="feedback-head">
        <p className="feedback-title">Feedback from Claude</p>
        <label className="feedback-model">
          Model
          <select
            value={model}
            onChange={(event) => {
              const chosen = event.target.value as FeedbackModel;
              setModel(chosen);
              remember(chosen);
            }}
          >
            {FEEDBACK_MODELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="feedback-note">{NOTE}</p>
      {!area.hasWorkedAnswer && <p className="feedback-note">{NO_WORKED_ANSWER}</p>}

      {(turns.length > 0 || writing !== null) && <FeedbackTurns turns={turns} writing={writing} />}
      {replyingElsewhere && writing === null && (
        <p className="feedback-status" role="status">
          Claude is still replying…
        </p>
      )}
      {notice && (
        <p className="feedback-notice" role="alert">
          {notice}
        </p>
      )}

      {availability.state === 'unavailable' ? (
        <p className="feedback-held">{availability.reason}</p>
      ) : availability.state === 'paused' ? (
        <p className="feedback-held">
          {availability.reason} It starts again at {resumesAtWords(availability.resumesAt)}.
        </p>
      ) : conversation === null || pending === 'start' ? (
        // Kept on screen through the first reply, disabled, so it cannot be pressed twice.
        !replyingElsewhere && (
          <div className="feedback-actions">
            <button
              type="button"
              className="response-save"
              disabled={busy || nothingTyped}
              onClick={() => void ask(typed)}
            >
              Get feedback
            </button>
          </div>
        )
      ) : firstFailed && sentFirst ? (
        !busy && (
          <div className="feedback-actions">
            <button
              type="button"
              className="response-save"
              onClick={() => void tryAgain(sentFirst)}
            >
              Try again
            </button>
            <button type="button" className="response-secondary" onClick={() => void startOver()}>
              Start over
            </button>
          </div>
        )
      ) : (
        // One composer for the whole conversation, so the box and its text survive a send.
        <>
          <Composer
            message={message}
            setMessage={setMessage}
            disabled={busy}
            onSend={() =>
              void run(
                {
                  action: 'follow_up',
                  model,
                  conversationId: conversation.conversationId,
                  expectedTurns: turns.length,
                  message,
                },
                () => setMessage(''),
              )
            }
          />
          {!busy && (
            <div className="feedback-actions">
              <button type="button" className="response-secondary" onClick={() => void startOver()}>
                Start over
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Composer({
  message,
  setMessage,
  disabled,
  onSend,
}: {
  readonly message: string;
  readonly setMessage: (text: string) => void;
  readonly disabled: boolean;
  readonly onSend: () => void;
}) {
  return (
    <div className="feedback-composer">
      <textarea
        className="response-box feedback-message"
        aria-label="Message to Claude"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={2}
      />
      <button
        type="button"
        className="response-save"
        disabled={disabled || message.trim() === ''}
        onClick={onSend}
      >
        Send
      </button>
    </div>
  );
}
